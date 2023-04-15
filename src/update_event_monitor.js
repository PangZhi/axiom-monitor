const { UpdateEvent } = require("./update_event");

const MonitorStatus = {
  IN_SYNC: 0,
  OUT_OF_SYNC: 1,
};

class UpdateEventMonitor {
  // {array}, the list of sorted history events
  #historyEvents;
  // {number}, the last block number when the monitor gets updated
  #lastUpdatedBlockNumber;
  // {enum}, OUT_OF_SYNC or IN_SYNC
  #status;
  // {number}, the threshold we don't view as out of sync, default 192
  #missing_threshold;

  constructor(missing_threshold = 192) {
    this.#historyEvents = [];
    // -1 means this monitor has not been initialized
    this.#lastUpdatedBlockNumber = -1;
    this.#status = MonitorStatus.IN_SYNC;
    this.#missing_threshold = missing_threshold;
  }

  getHistoryEvents() {
    return this.#historyEvents;
  }

  getLastUpdatedBlockNumber() {
    return this.#lastUpdatedBlockNumber;
  }

  getStatus() {
    return this.#status;
  }

  getMissingThrehold() {
    return this.#missing_threshold;
  }

  /**
   * Add a new blockchain event to the monitor, keep internal historyEvents merged and sorted
   * @param {UpdateEvent} event - The update event from blockchain
   */
  addEvent(event) {
    let matched = false;

    // find duplicate startBlockNumber, replace instead of pushing new entries
    for (let historyEvent of this.#historyEvents) {
      if (historyEvent.startBlockNumber === event.startBlockNumber) {
        historyEvent.numFinal = Math.max(historyEvent.numFinal, event.numFinal);
        matched = true;
        break;
      }
    }

    if (!matched) {
      this.#historyEvents.push(event);
    }

    // since the messages can come out of the order, keep the array sorted so comparsion will be straightforward
    this.#historyEvents.sort(
      (event0, event1) => event0.startBlockNumber - event1.startBlockNumber
    );

    // we can continue to merge entries so the array become super small and check is fast. But the array size is really small, 
    // <20K entries since genesis block, this should be optional
  }

  /**
   * Add udpate events to the monitor and the events should be up to latestBlock
   * @param {[UpdateEvent]} events
   * @param {number} latestBlock
   * @returns [MonitorStatus, MonitorStatus, [[number, number]]] originalStatus, newStatus, missingBlocks.
   * Missingblock is [startBlockNumber, lastBlockNumber], left side inclusive, right side exclusive
   */
  checkAndUpdateMonitorStatus(events, latestBlock) {
    for (let event of events) {
      this.addEvent(event);
    }

    let missingBlocks = this.getMissingBlocks(latestBlock);

    let oldStatus = this.#status;
    let newStatus =
      missingBlocks.length === 0
        ? MonitorStatus.IN_SYNC
        : MonitorStatus.OUT_OF_SYNC;
    this.#status = newStatus;
    this.#lastUpdatedBlockNumber = latestBlock;
    return [oldStatus, newStatus, missingBlocks];
  }

  /**
   * Get current missing ranges
   * @param {number} latestBlock
   * @returns
   */
  getMissingBlocks(latestBlock) {
    let missingBlocks = [];

    if (this.#historyEvents.length == 0) {
      // +1 as right side is exclusive
      missingBlocks.push([0, latestBlock - this.#missing_threshold + 1]);
      return missingBlocks;
    }

    let startBlock = this.#historyEvents[0].startBlockNumber;
    let nextBlock = this.#historyEvents[0].getFinalBlockNumber();

    if (startBlock > 0) {
      if (startBlock === 17031168) {
        console.log(
          "Missing block [0, 17031168], however, we ignore this missing block as it is in v0 contract"
        );
      } else {
        missingBlocks.push([0, startBlock]);
      }
    }

    for (let i = 1; i < this.#historyEvents.length; ++i) {
      let newStartBlock = this.#historyEvents[i].startBlockNumber;
      let newEndBlock = this.#historyEvents[i].getFinalBlockNumber();
      if (newStartBlock > nextBlock) {
        missingBlocks.push([nextBlock, newStartBlock]);
      }
      startBlock = newStartBlock;
      nextBlock = newEndBlock;
    }

    if (nextBlock < latestBlock - this.#missing_threshold) {
      missingBlocks.push([
        nextBlock,
        latestBlock - this.#missing_threshold + 1,
      ]);
    }

    return missingBlocks;
  }
}

module.exports = {
  UpdateEventMonitor,
  MonitorStatus,
};

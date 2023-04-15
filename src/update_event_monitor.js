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
    this.#lastUpdatedBlockNumber = 0;
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
  }

  /**
   * Add udpate events to the monitor and the events should be up to latestBlock
   * @param {[UpdateEvent]} events
   * @param {number} latestBlock
   * @returns [MonitorStatus, MonitorStatus, [[number, number]]] originalStatus, newStatus, missingBlocks
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

    if (this.#historyEvents.length == 0) return [];
    let startBlock = this.#historyEvents[0].startBlockNumber;
    let nextBlock = this.#historyEvents[0].getFinalBlockNumber();

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
      missingBlocks.push([nextBlock, latestBlock - this.#missing_threshold]);
    }

    return missingBlocks;
  }
}

module.exports = {
  UpdateEventMonitor,
  MonitorStatus,
};

const Web3 = require("web3");
const { UpdateEvent } = require("./update_event");
const { UpdateEventMonitor, MonitorStatus } = require("./update_event_monitor");

const PROVIDER_URL = process.env.PROVIDER_URL;
if (!PROVIDER_URL) {
  throw Error(
    "Please set PROVIDER_URL env variable, you can get it from infura or alchemy"
  );
}
const web3 = new Web3(PROVIDER_URL);

const AXIOM_ABI = require("../resources/axiom_abi.json");
const AXIOM_CONTRACT = "0xF990f9CB1A0aa6B51c0720a6f4cAe577d7AbD86A";
const contract = new web3.eth.Contract(AXIOM_ABI, AXIOM_CONTRACT);

/**
 * start a worker for a monitor, call monitor() to start the monitoring thread
 */
class MonitorWorker {
  #contract;
  #eventName;
  // we can extend the monitor to other events if we can create successful mapping between events/monitor calls and event names
  #eventMonitor;

  constructor(contract, eventName) {
    this.#contract = contract;
    this.#eventName = eventName;
    this.#eventMonitor = new UpdateEventMonitor();
  }

  async monitor() {
    // todo: retry on network error
    let latestBlock = await getLatestBlockNumber();

    // todo: retry on network error
    // todo: handle reorg
    var events = await this.#contract.getPastEvents(this.#eventName, {
      fromBlock: this.#eventMonitor.getLastUpdatedBlockNumber(),
      toBlock: latestBlock,
    });

    console.log(
      `Get ${
        events.length
      } new events for block ${this.#eventMonitor.getLastUpdatedBlockNumber()} to ${latestBlock}`
    );

    let updateEvents = [];
    for (let newEvent of events) {
      updateEvents.push(
        new UpdateEvent(
          Number(newEvent.returnValues["0"]),
          Number(newEvent.returnValues["3"])
        )
      );
    }

    let [oldStatus, newStatus, missingBlocks] =
      this.#eventMonitor.checkAndUpdateMonitorStatus(updateEvents, latestBlock);
    if (oldStatus === MonitorStatus.IN_SYNC) {
      if (newStatus === MonitorStatus.OUT_OF_SYNC) {
        console.log(`Updater become out of sync, find missing blocks`);

        missingBlocks.forEach((element) => console.log(element));
      } else {
        console.log(`Updater is still in sync`);
      }
    } else {
      if (newStatus === MonitorStatus.IN_SYNC) {
        console.log(`Updater alert resolved, it is in sync`);
      } else {
        console.log(`Updater is still out of sync, find missing blocks`);
        missingBlocks.forEach((element) => console.log(element));
      }
    }

    // check every 20s
    setTimeout(() => this.monitor(), 20000);
  }
}

const getLatestBlockNumber = async () => {
  const currentBlock = await web3.eth.getBlockNumber();
  return currentBlock;
};

const runMonitor = async () => {
  let worker = new MonitorWorker(contract, "UpdateEvent");
  try {
    await worker.monitor();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  runMonitor,
};

class UpdateEvent {
  constructor(startBlockNumber, numFinal) {
    this.startBlockNumber = startBlockNumber;
    this.numFinal = numFinal;
  }

  getFinalBlockNumber() {
    return this.startBlockNumber + this.numFinal;
  }
}

module.exports = {
  UpdateEvent,
};

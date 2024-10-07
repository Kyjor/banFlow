const ISO8601Service = {
  getISO8601Time() {
    const now = new Date();
    return now.toISOString();
  },
};

export default ISO8601Service;

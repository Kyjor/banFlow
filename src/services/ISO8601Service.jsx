class ISO8601Service {
  getISO8601Time = () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const date = `${today.getFullYear()}-${month < 10 ? `0${month}` : month}-${
      day < 10 ? `0${day}` : day
    }`;
    const hours = today.getHours();
    const minutes = today.getMinutes();
    const seconds = today.getSeconds();
    const time = `${hours < 10 ? `0${hours}` : hours}:${
      minutes < 10 ? `0${minutes}` : minutes
    }:${seconds < 10 ? `0${seconds}` : seconds}`;
    return `${date}T${time}`;
  };
}

const ISO8601ServiceInstance = new ISO8601Service();

export default ISO8601ServiceInstance;

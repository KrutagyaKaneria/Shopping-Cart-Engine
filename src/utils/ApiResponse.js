const success = (data) => {
  return {
    success: true,
    data
  };
};

const failure = (code, message, details = null) => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
};

module.exports = {
  success,
  failure
};

const generateCode = (size) => {
  const validChars = '0123456789';
  let value = '';
  for (let i = size; i > 0; i -= 1) {
    value += validChars[Math.round(Math.random() * (validChars.length - 1))];
  }
  return value;
};

module.exports = {
  generateCode,
};

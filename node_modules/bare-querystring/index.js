function escape(input) {
  return encodeURIComponent(input)
}

exports.escape = escape

function unescape(input) {
  return decodeURIComponent(input)
}

exports.unescape = unescape

exports.parse = function parse(input, separator = '&', delimiter = '=') {
  const params = Object.create(null)

  for (let sequence of input.split(separator)) {
    if (sequence === '') continue

    sequence = sequence.replace(/\+/g, ' ')

    let [key, value] = sequence.split(delimiter)

    key = unescape(key)
    value = unescape(value || '')

    params[key] = key in params ? [].concat(params[key], value) : value
  }

  return params
}

exports.stringify = function stringify(params, separator = '&', delimiter = '=') {
  return Object.entries(params)
    .map(([key, value]) =>
      (Array.isArray(value) ? value : [value])
        .map((value) => escape(key) + delimiter + escape(value))
        .join(separator)
    )
    .join(separator)
}

exports.decode = exports.parse
exports.encode = exports.stringify

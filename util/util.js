function makeErrorJson(str) {
  return `{ "error": "${ str }" }`;
} 

exports.makeErrorJson = makeErrorJson;

function verify(required, data) {
  let response = '';
  let error = false;
  
  required.forEach(function(r) {
    if (!data[r] || data[r] == null || data[r] === '') {
      response = response.concat(r + ' ');
      error = true;
    }
  })


  return { error: error, response: response };
}

exports.verify = verify;

function invalidToken() {
  return makeErrorJson('The provided token is invalid.');
}

exports.invalidToken = invalidToken;

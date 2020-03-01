const crypto = require('crypto')

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

function serverError() {
  return makeErrorJson('An internal server error occurred.')
}

exports.serverError = serverError;

function generateToken(type, id, database) {
  
    //generate random token that links to teacher
    randToken = crypto.randomBytes(64).toString('hex');
    const token = {
      value: randToken,
      type: type,
      'link-id': id
    }

    //TODO: verify that randomly generated token value is unique (very very unlikely that it isn't but just in case)

    const db = database; 
    const dbo = db.db();
    
    //insert token into database
    //TODO: instead of just replacing tokens, give tokens an expiry date
    dbo.collection('tokens').replaceOne( { 'link-id': id }, token, { upsert: true }, function(err) {
      if (err)
        console.log(err);

      db.close();
    });

    return randToken;
}

exports.generateToken = generateToken;

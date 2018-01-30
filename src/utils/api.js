
import fetch from 'isomorphic-fetch';

export default async function apiCall(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || contentType.indexOf('application/json') === -1) {
    throw new Error('Invalid response from server');
  }
  const responseData = await response.json();
  if (responseData.error) {
    const error = new Error('ApiError');
    error.type = responseData.error.type;
    error.field = responseData.error.field;
    throw error;
  }
  return responseData;
}

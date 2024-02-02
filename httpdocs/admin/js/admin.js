function wipeout() {
  var url = '/admin/admin.php';
  var data = {
    password: document.querySelector('input[type="password"]').value,
  };
  fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {'Content-Type': 'application/json'}
    }).then(res => res.json())
    .then(function(response) {
      if (response.hasOwnProperty('error'))
        document.querySelector('#result').innerHTML = `<font style="color:red">${response.error}</font>`;
      else
        document.querySelector('#result').innerHTML = response.status;
      console.log('Success:', JSON.stringify(response));
    })
    .catch(error => console.error('Error:', error));
  return false;
}

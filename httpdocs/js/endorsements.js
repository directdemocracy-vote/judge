window.onload = function() {
  const judge = window.location.protocol + '//' + window.location.host;
  const notary = judge.replace('judge', 'notary');
  let content = document.getElementById('content');
  fetch(`${notary}/api/judge.php`, {method: 'POST', headers:{'Content-Type': 'application/x-www-form-urlencoded'}, body: `judge=${encodeURIComponent(judge)}`})
    .then((reponse) => response.json())
    .then((answer) => {
      if (answer.error) {
        console.log(answer.error);
        return;
      }
      let table = document.createElement('table');
      let thead = document.createElement('thead');
      table.classList.add('table');
      table.appendChild(thead);
      let tr = document.createElement('tr');
      thead.appendChild(tr);
      let th = document.createElement('th');
      tr.appendChild(th);
      th.innerHTML = 'Date';
      tr.appendChild(th);
      th = document.createElement('th');
      tr.appendChild(th);
      th.innerHTML = 'Name';
      let tbody = document.createElement('tbody');
      table.appendChild(tbody);
      for (i = 0; i < answer.endorsements.length; i++) {
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        let endorsement = answer.endorsements[i];
        let td = document.createElement('td');
        td.innerHTML = new Date(endorsement.published).toISOString().slice(0, 19).replace('T', ' ');
        tr.appendChild(td);
        td = document.createElement('td');
        if (endorsement.revoke) {
          td.style.textDecoration = 'line-through';
          td.title = 'revoked';
        } else
          td.title = 'endorsed';
        let a = document.createElement('a');
        td.appendChild(a);
        a.href = '/citizen.html?fingerprint=' + endorsement.fingerprint;
        a.innerHTML = endorsement.givenNames + ' ' + endorsement.familyName;
        tr.appendChild(td);
      }
      content.appendChild(table);
    });
}

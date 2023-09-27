window.onload = function() {
  const judge = window.location.protocol + '//' + window.location.host;
  const notary = judge.replace('judge', 'notary');
  let content = document.getElementById('content');
  fetch(`${notary}/api/judge.php`, {method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `judge=${encodeURIComponent(judge)}`})
    .then((response) => response.json())
    .then((answer) => {
      if (answer.error) {
        console.log(answer.error);
        return;
      }
      let table = document.createElement('table');
      let thead = document.createElement('thead');
      table.classList.add('table', 'is-striped');
      table.appendChild(thead);
      let tr = document.createElement('tr');
      thead.appendChild(tr);
      let th = document.createElement('th');
      tr.appendChild(th);
      th.innerHTML = 'Status';
      tr.appendChild(th);
      th = document.createElement('th');
      tr.appendChild(th);
      th.innerHTML = 'Name';
      th = document.createElement('th');
      tr.appendChild(th);
      th.innerHTML = 'Date';
      let tbody = document.createElement('tbody');
      table.appendChild(tbody);
      for (let i = 0; i < answer.endorsements.length; i++) {
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        let endorsement = answer.endorsements[i];
        let td = document.createElement('td');
        if (endorsement.latest) {
          td.setAttribute('align', 'center');
          const title = endorsement.revoke ? 'revoked' : 'endorsed';
          const color = endorsement.revoke ? 'red' : 'green';
          const icon = endorsement.revoke ? 'xmark_seal_fill' : 'checkmark_seal_fill';
          td.innerHTML = `<i title="${title}" class="icon f7-icons" style="color:${color};font-size:110%">${icon}</i>`;
        }
        tr.appendChild(td);
        td = document.createElement('td');
        if (endorsement.revoke) {
          td.style.textDecoration = 'line-through';
          td.title = 'revoked';
        } else
          td.title = 'endorsed';
        let a = document.createElement('a');
        td.appendChild(a);
        a.href = `${notary}/citizen.html?fingerprint=${CryptoJS.SHA1(endorsement.signature).toString()}`;
        a.innerHTML = endorsement.givenNames + ' ' + endorsement.familyName;
        tr.appendChild(td);
        td = document.createElement('td');
        td.innerHTML = new Date(endorsement.published * 1000).toLocaleString();
        tr.appendChild(td);
      }
      content.appendChild(table);
    });
};

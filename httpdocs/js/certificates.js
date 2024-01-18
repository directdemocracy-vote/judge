window.onload = function() {
  const judge = window.location.protocol + '//' + window.location.host;
  const notary = judge.replace('judge', 'notary');
  const content = document.getElementById('content');
  fetch(`${notary}/api/certificates.php`, {method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `judge=${encodeURIComponent(judge)}`})
    .then(response => response.json())
    .then(answer => {
      if (answer.error) {
        console.log(answer.error);
        return;
      }
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      table.classList.add('table', 'is-striped');
      table.appendChild(thead);
      const tr = document.createElement('tr');
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
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      for (let i = 0; i < answer.certificates.length; i++) {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        const certificate = answer.certificates[i];
        let td = document.createElement('td');
        const trusted = certificate.type === 'trust';
        if (certificate.latest) {
          td.setAttribute('align', 'center');
          const title = trusted ? 'trusted' : 'distrusted';
          const color = trusted ? 'green' : 'red';
          const icon = trusted ? 'checkmark_seal_fill' : 'xmark_seal_fill';
          td.innerHTML = `<i title="${title}" class="icon f7-icons" style="color:${color};font-size:110%">${icon}</i>`;
        }
        tr.appendChild(td);
        td = document.createElement('td');
        if (!trusted) {
          td.style.textDecoration = 'line-through';
          td.title = 'distrusted';
        } else
          td.title = 'trusted';
        const a = document.createElement('a');
        td.appendChild(a);
        a.href = `${notary}/citizen.html?signature=${encodeURIComponent(certificate.signature)}`;
        a.innerHTML = certificate.givenNames + ' ' + certificate.familyName;
        tr.appendChild(td);
        td = document.createElement('td');
        td.innerHTML = new Date(certificate.published * 1000).toLocaleString();
        tr.appendChild(td);
      }
      content.appendChild(table);
    });
};

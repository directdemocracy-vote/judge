window.onload = function() {
  const judge = window.location.protocol + '//' + window.location.host;
  const notary = judge.replace('judge', 'notary');
  const content = document.getElementById('content');
  fetch(`${notary}/api/judge.php`, {method: 'POST',
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
      for (let i = 0; i < answer.trusts.length; i++) {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);
        const trust = answer.trusts[i];
        let td = document.createElement('td');
        if (trust.latest) {
          td.setAttribute('align', 'center');
          const title = trust.trusted ? 'trusted' : 'distrusted';
          const color = trust.trusted ? 'green' : 'red';
          const icon = trust.trusted ? 'checkmark_seal_fill' : 'xmark_seal_fill';
          td.innerHTML = `<i title="${title}" class="icon f7-icons" style="color:${color};font-size:110%">${icon}</i>`;
        }
        tr.appendChild(td);
        td = document.createElement('td');
        if (!trust.trusted) {
          td.style.textDecoration = 'line-through';
          td.title = 'distrusted';
        } else
          td.title = 'trusted';
        const a = document.createElement('a');
        td.appendChild(a);
        a.href = `${notary}/citizen.html?signature=${encodeURIComponent(trust.signature)}`;
        a.innerHTML = trust.givenNames + ' ' + trust.familyName;
        tr.appendChild(td);
        td = document.createElement('td');
        td.innerHTML = new Date(trust.published * 1000).toLocaleString();
        tr.appendChild(td);
      }
      content.appendChild(table);
    });
};

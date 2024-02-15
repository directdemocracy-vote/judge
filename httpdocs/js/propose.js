const directdemocracyVersion = '2';
const notary = 'https://notary.directdemocracy.vote';

function findGetParameter(parameterName, result = null) {
  location.search.substr(1).split('&').forEach(function(item) {
    const tmp = item.split('=');
    if (tmp[0] === parameterName)
      result = decodeURIComponent(tmp[1]);
  });
  return result;
}

function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = content;
  document.getElementById('modal').classList.add('is-active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('is-active');
}

window.onload = function() {
  let area = '';
  if (localStorage.getItem('password')) {
    const a = document.createElement('a');
    a.setAttribute('id', 'logout');
    a.textContent = 'logout';
    document.getElementById('logout-div').appendChild(a);
    document.getElementById('logout').addEventListener('click', function(event) {
      document.getElementById('logout-div').textContent = '';
      localStorage.removeItem('password');
    });
  }
  document.getElementById('modal-close-button').addEventListener('click', closeModal);
  document.getElementById('modal-ok-button').addEventListener('click', closeModal);
  let deadlineDefaultDate = new Date();
  deadlineDefaultDate.setMonth(deadlineDefaultDate.getMonth() + 3);
  document.getElementById('deadline-date').valueAsDate = deadlineDefaultDate;
  document.getElementById('time-zone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const type = findGetParameter('type', 'none');
  if (type === 'referendum' || type === 'petition') {
    document.getElementById(type).checked = true;
    updateProposalType();
  }
  let latitude = parseFloat(findGetParameter('latitude', '-1'));
  let longitude = parseFloat(findGetParameter('longitude', '-1'));
  let geolocation = false;
  function getGeolocationPosition(position) {
    geolocation = true;
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    updateArea();
  }
  if (latitude === -1) {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(getGeolocationPosition);
    fetch('https://ipinfo.io/loc')
      .then(response => {
        if (response.status === 429)
          console.error('quota exceeded');
        return response.text();
      })
      .then(answer => {
        if (!geolocation) {
          const coords = answer.split(',');
          getGeolocationPosition({ coords: { latitude: coords[0], longitude: coords[1] } });
        }
      });
  } else
    updateArea();

  document.getElementById('area').addEventListener('change', areaChange);
  document.getElementById('referendum').addEventListener('change', updateProposalType);
  document.getElementById('petition').addEventListener('change', updateProposalType);
  document.getElementById('title').addEventListener('input', validate);
  document.getElementById('description').addEventListener('input', validate);
  document.getElementById('question').addEventListener('input', validate);
  document.getElementById('answers').addEventListener('input', validate);
  document.getElementById('deadline-date').addEventListener('input', validate);
  document.getElementById('deadline-hour').addEventListener('input', validate);

  function updateArea() {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`)
      .then(response => response.json())
      .then(answer => {
        const address = answer.address;
        const select = document.getElementById('area');
        let count = 0;

        function addAdminLevel(level, betaPlaces) {
          if (level in address || answer.place_id in betaPlaces)
            select.options[count++] = new Option(address[level], level);
        }
        // we ignore irrelevant admin levels: 'block', 'neighbourhood', 'quarter', 'hamlet', 'municipality', 'region'
        const admin = [
          'suburb',
          'borough',
          'village',
          'town',
          'city',
          'county',
          'district',
          'province',
          'state_district',
          'state',
          'country'];
        const betaPlaces = [
          70304398, // Le Poil (fr)
        ];
        admin.forEach(function(item) { addAdminLevel(item, betaPlaces); });
        const countryCode = address.country_code.toUpperCase();
        if (['DE', 'FR', 'IT', 'SE', 'PL', 'RO', 'HR', 'ES', 'NL', 'IE', 'BG', 'DK', 'GR',
          'AT', 'HU', 'FI', 'CZ', 'PT', 'BE', 'MT', 'CY', 'LU', 'SI', 'LU', 'SK', 'EE', 'LV'].indexOf(countryCode) >= 0) {
          select.options[count] = new Option('', 'union');
          translator.translateElement(select.options[count], 'european-union');
          count++;
        }
        select.options[count] = new Option('', 'world');
        translator.translateElement(select.options[count], 'world');
        count++;
        areaChange();
      });
  }

  function areaChange() {
    const a = document.getElementById('area');
    const selectedName = a.options[a.selectedIndex].textContent;
    const selectedType = a.options[a.selectedIndex].value;
    area = '';
    let query = '';
    for (let i = a.selectedIndex; i < a.length - 1; i++) {
      let type = a.options[i].value;
      if (['village', 'town', 'municipality'].includes(type))
        type = 'city';
      const name = a.options[i].textContent;
      area += type + '=' + name + '\n';
      if (type !== 'union')
        query += type + '=' + encodeURIComponent(name) + '&';
    }
    query = query.slice(0, -1);
    const place = document.getElementById('place');
    place.textContent = selectedName;
    if (selectedType === 'union')
      place.href = 'https://en.wikipedia.org/wiki/European_Union';
    else if (selectedType === 'world')
      place.href = 'https://en.wikipedia.org/wiki/Earth';
    else
      place.href = 'https://nominatim.openstreetmap.org/ui/search.html?' + query + '&polygon_geojson=1';
    validate();
  }

  function updateProposalType() {
    if (document.querySelector('input[name="type"]:checked').value === 'referendum') {
      document.getElementById('question-block').style.display = 'block';
      document.getElementById('answers-block').style.display = 'block';
    } else {
      document.getElementById('question-block').style.display = 'none';
      document.getElementById('answers-block').style.display = 'none';
    }
    validate();
  }

  function validate() {
    document.getElementById('publish').setAttribute('disabled', '');
    if (!document.querySelector('input[name="type"]:checked'))
      return;
    const type = document.querySelector('input[name="type"]:checked').value;
    if (document.getElementById('title').value === '')
      return;
    if (document.getElementById('description').value === '')
      return;
    if (type === 'referendum') {
      if (document.getElementById('question').value === '')
        return;
      if (document.getElementById('answers').value === '')
        return;
    }
    if (document.getElementById('deadline-date').value === '')
      return;
    const hour = document.getElementById('deadline-hour').value;
    if (hour === '' || hour > 23 || hour < 0)
      return;
    document.getElementById('publish').removeAttribute('disabled');
  }

  document.getElementById('publish').addEventListener('click', function(event) {
    const button = event.currentTarget;
    button.classList.add('is-loading');
    button.setAttribute('disabled', '');
    const query = area.trim().replace(/(\r\n|\n|\r)/g, '&');
    fetch(`/api/publish_area.php?${query}`)
      .then(response => response.json())
      .then(function(answer) {
        if (answer.error) {
          showModal('Area publication error', JSON.stringify(answer.error));
          button.classList.remove('is-loading');
          button.removeAttribute('disabled');
        } else {
          let publication = {};
          publication.schema = `https://directdemocracy.vote/json-schema/${directdemocracyVersion}/proposal.schema.json`;
          publication.key = '';
          publication.signature = '';
          publication.published = Math.round(new Date().getTime() / 1000);
          publication.area = answer.id;
          publication.title = document.getElementById('title').value.trim();
          publication.description = document.getElementById('description').value.trim();
          const type = document.querySelector('input[name="type"]:checked').value;
          if (type === 'referendum') {
            publication.question = document.getElementById('question').value.trim();
            publication.answers = document.getElementById('answers').value.trim().split('\n');
            publication.type = type;
            publication.secret = true;
          } else {
            publication.type = type;
            publication.secret = false;
          }
          const hour = parseInt(document.getElementById('deadline-hour').value);
          const offset = Math.ceil(new Date().getTimezoneOffset() / 60);
          publication.deadline = Math.round(Date.parse(document.getElementById('deadline-date').value) / 1000) + (hour + offset) * 3600;
          publication.trust = parseInt(document.getElementById('trust').value);
          const website = document.getElementById('website').value.trim();
          if (website)
            publication.website = website;
          fetch(`/api/publish_proposal.php`, { 'method': 'POST', 'body': JSON.stringify(publication) })
            .then(response => response.json())
            .then(answer => {
              button.classList.remove('is-loading');
              button.removeAttribute('disabled');
              if (answer.error)
                showModal(translator.translate('publication-error'), JSON.stringify(answer.error));
              else {
                showModal(translator.translate('publication-success'), translator.translate(type === 'petition' ? 'petition-confirmation' : 'referendum-confirmation'));
                document.getElementById('modal-ok-button').addEventListener('click', function() {
                  window.location.href = `${notary}/proposal.html?signature=${encodeURIComponent(answer.signature)}`;
                });
              }
            });
        }
      });
  });
};

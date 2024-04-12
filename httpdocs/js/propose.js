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
  let betaLink = null;
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
  const publish = document.getElementById('publish');
  document.getElementById('modal-close-button').addEventListener('click', closeModal);
  document.getElementById('modal-ok-button').addEventListener('click', closeModal);
  let deadlineDefaultDate = new Date();
  deadlineDefaultDate.setMonth(deadlineDefaultDate.getMonth() + 3);
  document.getElementById('deadline-date').valueAsDate = deadlineDefaultDate;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.getElementById('publication-time-zone').textContent = timeZone;
  document.getElementById('deadline-time-zone').textContent = timeZone;
  const type = findGetParameter('type', 'none');
  if (type === 'referendum' || type === 'petition') {
    document.getElementById(type).checked = true;
    updateProposalType();
  }
  let latitude = parseFloat(findGetParameter('latitude', '-1'));
  let longitude = parseFloat(findGetParameter('longitude', '-1'));
  let reference = findGetParameter('reference');
  let geolocation = false;
  function getGeolocationPosition(position) {
    geolocation = true;
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    updateArea();
  }
  if (reference) {
    fetch(`/api/proposal.php?reference=${reference}`)
      .then(response => response.json())
      .then(answer => {
        if (answer.error) {
          console.error(answer);
          return;
        }
        console.log(answer);
        document.getElementById(answer.type).checked = true;
        const select = document.getElementById('area');
        let count = 0;
        for(area of answer.area.split('\n')) {
          const a = area.split('=');
          if (count === 0) {
            const place = document.getElementById('place');
            place.textContent = a[1];
            if (a[0] === 'union')
              place.href = 'https://en.wikipedia.org/wiki/European_Union';
            else if (a[0] === 'world')
              place.hred = 'https://en.wikipedia.org/wiki/Earth';
            place.href = 'https://nominatim.openstreetmap.org/ui/search.html?' + answer.area.replace('\n', '&') + '&polygon_json=1';
          }
          select.options[count++] = new Option(a[1], a[0]);
        }
        document.getElementById('title').value = answer.title;
        document.getElementById('description').value = answer.description;
        document.getElementById('question').value = answer.question;
        document.getElementById('answers').value = answer.answers;
        document.getElementById('website').value = answer.website;
        const publicationDate = new Date(answer.publication * 1000);
        document.getElementById('publication-date').valueAsDate = publicationDate;
        document.getElementById('publication-hour').value = publicationDate.getHours();
        const deadlineDate = new Date(answer.deadline * 1000);
        document.getElementById('deadline-date').valueAsDate = deadlineDate;
        document.getElementById('deadline-hour').value = deadlineDate.getHours();
        document.getElementById('trust').value = answer.trust;
        document.getElementById('email').value = answer.email;
      });
  } else {
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
  }
  document.getElementById('area').addEventListener('change', areaChange);
  document.getElementById('referendum').addEventListener('change', updateProposalType);
  document.getElementById('petition').addEventListener('change', updateProposalType);
  document.getElementById('title').addEventListener('input', validate);
  document.getElementById('description').addEventListener('input', validate);
  document.getElementById('question').addEventListener('input', validate);
  document.getElementById('answers').addEventListener('input', validate);
  document.getElementById('publication-date').addEventListener('input', validate);
  document.getElementById('publication-hour').addEventListener('input', validate);
  document.getElementById('deadline-date').addEventListener('input', validate);
  document.getElementById('deadline-hour').addEventListener('input', validate);
  document.getElementById('email').addEventListener('input', validate);

  function updateArea() {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`)
      .then(response => response.json())
      .then(answer => {
        const address = answer.address;
        const select = document.getElementById('area');
        let count = 0;

        if (latitude === 38.2115 && longitude === -119.0126) { // Bodie (USA, English beta test)
          select.options[count++] = new Option('Bodie', 'building');
          betaLink = 'https://nominatim.openstreetmap.org/ui/details.html?osmtype=R&osmid=227078&class=leisure';
        } else if (answer.osm_id === 6834621) { // Le Poil (France, French beta test)
          select.options[count++] = new Option('Le Poil', 'hamlet');
          betaLink = 'https://nominatim.openstreetmap.org/ui/details.html?osmtype=R&osmid=6834621&class=boundary';
        } else
          betaLink = null;
        // we ignore irrelevant admin levels: 'block', 'neighbourhood', 'quarter', 'hamlet', 'municipality', 'region'
        function addAdminLevel(level) {
          if (level in address)
            select.options[count++] = new Option(address[level], level);
        }
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
        admin.forEach(function(item) { addAdminLevel(item); });
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
    area = area.slice(0, -1);
    query = query.slice(0, -1);
    const place = document.getElementById('place');
    place.textContent = selectedName;
    if (selectedType === 'union')
      place.href = 'https://en.wikipedia.org/wiki/European_Union';
    else if (selectedType === 'world')
      place.href = 'https://en.wikipedia.org/wiki/Earth';
    else if (betaLink && a.selectedIndex === 0)
      place.href = betaLink;
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
    if (publish)
      publish.setAttribute('disabled', '');
    else
      document.getElementById('submit').setAttribute('disabled', '');      
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
    if (document.getElementById('publication-date').value === '')
      return;
    const publicationHour = document.getElementById('publication-hour').value;
    if (publicationHour === '' || publicationHour > 23 || publicationHour < 0)
      return;
    if (document.getElementById('deadline-date').value === '')
      return;
    const deadlineHour = document.getElementById('deadline-hour').value;
    if (deadlineHour === '' || deadlineHour > 23 || deadlineHour < 0)
      return;
    if (document.getElementById('email').value === '')
      return;
    if (publish)
      publish.remoteAttribute('disabled');
    else
      document.getElementById('submit').removeAttribute('disabled');
  }
  document.getElementById('submit').addEventListener('click', function(event) {
    const button = event.currentTarget;
    const type = document.querySelector('input[name="type"]:checked').value;
    const offset = Math.ceil(new Date().getTimezoneOffset() / 60);
    const deadlineHour = parseInt(document.getElementById('deadline-hour').value);
    const deadline = Math.round(Date.parse(document.getElementById('deadline-date').value) / 1000) + (deadlineHour + offset) * 3600;
    const publicationHour = parseInt(document.getElementById('publication-hour').value);
    const publication = Math.round(Date.parse(document.getElementById('publication-date').value) / 1000) + (publicationHour + offset) * 3600;
    const language = document.getElementById('language').firstChild.src.split('.')[1].split('/')[3];
    let proposal = {
      type: type,
      area: area,
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      question: type === 'referendum' ? document.getElementById('question').value.trim() : '',
      answers: type === 'referendum' ? document.getElementById('answers').value.trim() : '',
      secret: type === 'referendum',
      publication: publication,
      deadline: deadline,
      trust: parseInt(document.getElementById('trust').value),
      website: document.getElementById('website').value.trim(),
      email: document.getElementById('email').value.trim(),
      language: language
    };
    if (reference)
      proposal.reference = reference;
    fetch(`/api/submit_proposal.php`, { 'method': 'POST', 'body': JSON.stringify(proposal) })
      .then(response => response.json())
      .then(answer => {
        button.classList.remove('is-loading');
        button.removeAttribute('disabled');
        if (answer.error)
          showModal(translator.translate('submission-error'), JSON.stringify(answer.error));
        else {
          showModal(translator.translate('submission-success'), translator.translate(type === 'petition' ? 'petition-submission-confirmation' : 'referendum-submission-confirmation'));
          document.getElementById('modal-ok-button').addEventListener('click', function() {
            // window.location.href = `/propose.html?reference=${encodeURIComponent(answer.reference)}`;
            window.location.href = 'https://judge.directdemocracy.vote';
          });
        }
      });
  });
  if (publish)
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

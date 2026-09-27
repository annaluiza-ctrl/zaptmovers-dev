/*
  Zapt Movers — address autocomplete and drive time.

  Handles three situations without you having to open a console:

  1. No key configured        -> plain text fields + a visible note on the page
  2. New Google project       -> PlaceAutocompleteElement + Routes API
  3. Project from before 2025 -> falls back to the legacy Autocomplete widget

  Google deprecated google.maps.places.Autocomplete and the Distance Matrix
  API for new customers on March 1st 2025, so we try the new API first and
  only fall back if the new one is not present.

  onPick(which, record)  -> { text, lat, lng, city, state, zip }
  onNote(message, kind)  -> surface a problem to the user, kind is 'warn' or 'info'
*/
(function () {
  'use strict';

  var apiKey = '';
  var onPickCb = function () {};
  var onNoteCb = function () {};
  var mode = 'none';

  function note(msg, kind) { onNoteCb(msg, kind || 'warn'); }

  function componentsFrom(list, get) {
    var rec = {};
    (list || []).forEach(function (c) {
      var types = c.types || [];
      var longName = get ? get(c) : c.long_name;
      var shortName = c.shortText || c.short_name || longName;
      if (types.indexOf('locality') > -1) rec.city = longName;
      if (types.indexOf('administrative_area_level_1') > -1) rec.state = shortName;
      if (types.indexOf('postal_code') > -1) rec.zip = longName;
    });
    return rec;
  }

  /* ---------- new API ---------- */
  async function wireNew(input, which) {
    var lib = await google.maps.importLibrary('places');
    var El = lib.PlaceAutocompleteElement;
    if (!El) return false;

    var el = new El({ includedRegionCodes: ['us'] });
    el.id = input.id + 'New';
    el.style.width = '100%';
    if (input.placeholder) {
      try { el.placeholder = input.placeholder; } catch (e) {}
    }
    input.parentNode.insertBefore(el, input);
    input.type = 'hidden';

    async function handle(place) {
      if (!place) return;
      try {
        await place.fetchFields({ fields: ['formattedAddress', 'location', 'addressComponents'] });
      } catch (e) {
        console.error('Zapt places: fetchFields failed', e);
        return;
      }
      var loc = place.location;
      var rec = Object.assign({
        text: place.formattedAddress,
        lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
        lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng
      }, componentsFrom(place.addressComponents, function (c) { return c.longText || c.long_name; }));
      input.value = rec.text;
      onPickCb(which, rec);
    }

    // Google renamed this event between versions, so listen for both.
    el.addEventListener('gmp-select', function (ev) {
      handle(ev.placePrediction ? ev.placePrediction.toPlace() : null);
    });
    el.addEventListener('gmp-placeselect', function (ev) {
      handle(ev.place || null);
    });
    return true;
  }

  /* ---------- legacy API ---------- */
  function wireLegacy(input, which) {
    if (!google.maps.places || !google.maps.places.Autocomplete) return false;
    var ac = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry', 'address_components']
    });
    ac.addListener('place_changed', function () {
      var p = ac.getPlace();
      if (!p || !p.geometry) return;
      var rec = Object.assign({
        text: p.formatted_address,
        lat: p.geometry.location.lat(),
        lng: p.geometry.location.lng()
      }, componentsFrom(p.address_components));
      onPickCb(which, rec);
    });
    return true;
  }

  /* ---------- drive time ---------- */
  async function driveTime(from, to) {
    if (!from || !to || !from.lat || !to.lat) return null;

    // Routes API first — available on every project, new or old.
    try {
      var res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
          destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
          travelMode: 'DRIVE'
        })
      });
      if (res.ok) {
        var data = await res.json();
        var r = (data.routes || [])[0];
        if (r) {
          return {
            minutes: Math.round(parseInt(r.duration, 10) / 60),
            miles: r.distanceMeters / 1609.34
          };
        }
      } else {
        console.warn('Zapt places: Routes API returned', res.status, await res.text());
      }
    } catch (e) {
      console.warn('Zapt places: Routes API unreachable', e);
    }

    // Legacy fallback for projects created before March 2025.
    if (window.google && google.maps && google.maps.DistanceMatrixService) {
      return new Promise(function (resolve) {
        new google.maps.DistanceMatrixService().getDistanceMatrix({
          origins: [{ lat: from.lat, lng: from.lng }],
          destinations: [{ lat: to.lat, lng: to.lng }],
          travelMode: 'DRIVING'
        }, function (res, status) {
          if (status !== 'OK') { resolve(null); return; }
          var e = res.rows[0].elements[0];
          if (e.status !== 'OK') { resolve(null); return; }
          resolve({ minutes: Math.round(e.duration.value / 60), miles: e.distance.value / 1609.34 });
        });
      });
    }
    return null;
  }

  /* ---------- boot ---------- */
  function init(opts) {
    apiKey = (opts.key || '').trim();
    onPickCb = opts.onPick || onPickCb;
    onNoteCb = opts.onNote || onNoteCb;
    var fields = opts.fields; // { origin: inputEl, destination: inputEl }

    if (!apiKey) {
      mode = 'manual';
      note('Address autocomplete is off. Type the full address including city, state and ZIP — we will confirm the drive time by phone.', 'info');
      console.warn('Zapt places: googleMapsKey is empty in /assets/pricing.json. '
        + 'Set it in /admin/pricing/, click Download pricing.json, replace the file in the repo and deploy. '
        + 'Saving in the settings page only affects your own browser.');
      return;
    }

    window.zaptMapsReady = async function () {
      try {
        for (var which in fields) {
          var input = fields[which];
          var ok = false;
          try { ok = await wireNew(input, which); } catch (e) {
            console.warn('Zapt places: new autocomplete unavailable', e);
          }
          if (ok) { mode = 'new'; continue; }
          if (wireLegacy(input, which)) { mode = 'legacy'; continue; }
          mode = 'manual';
        }
        if (mode === 'manual') {
          note('Address autocomplete could not start. Please type the full address including city, state and ZIP.', 'warn');
        } else {
          note('', 'clear');
          console.log('Zapt places: autocomplete running in "' + mode + '" mode.');
        }
      } catch (e) {
        console.error('Zapt places: init failed', e);
        note('Address autocomplete could not start. Please type the full address including city, state and ZIP.', 'warn');
      }
    };

    // Google calls this on any auth problem: bad key, wrong referrer, no billing.
    window.gm_authFailure = function () {
      mode = 'manual';
      note('Address lookup is unavailable right now. Please type the full address including city, state and ZIP.', 'warn');
      console.error('Zapt places: Google rejected the API key. Check, in Google Cloud Console: '
        + '(1) HTTP referrer restrictions include this exact domain, '
        + '(2) Maps JavaScript API, Places API and Routes API are enabled, '
        + '(3) the project has an active billing account.');
    };

    var s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey)
          + '&libraries=places&loading=async&callback=zaptMapsReady';
    s.async = true;
    s.onerror = function () {
      mode = 'manual';
      note('Address lookup could not load. Please type the full address including city, state and ZIP.', 'warn');
      console.error('Zapt places: the Google Maps script failed to load. Usually a blocked network or an invalid key.');
    };
    document.head.appendChild(s);

    // If nothing has happened after 8 seconds, stop leaving the user guessing.
    setTimeout(function () {
      if (mode === 'none') {
        note('Address lookup is taking too long. You can type the full address instead.', 'warn');
        console.warn('Zapt places: Maps did not initialise within 8s.');
      }
    }, 8000);
  }

  window.ZaptPlaces = { init: init, driveTime: driveTime, mode: function () { return mode; } };
})();

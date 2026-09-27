/*
  Zapt Movers — booking calculator.

  Pure functions. No DOM, no network. Feed it the job and the settings,
  it returns the crew, the truck, the hours and the money.

  This is deliberately separate from the UI so you can open the console on
  the booking page and run ZaptQuote.calculate(job, settings) by hand to
  check a number against what your dispatcher would have quoted.
*/
(function () {
  'use strict';

  function totals(inventory) {
    var t = { cuft: 0, lbs: 0, pieces: 0, tvs: 0, specialty: [], heavyCount: 0 };
    inventory.forEach(function (line) {
      var q = line.qty || 0;
      if (!q) return;
      t.cuft += line.cuft * q;
      t.lbs += line.lbs * q;
      t.pieces += q;
      if (/^TV,/.test(line.n)) t.tvs += q;
      if (line.heavy) t.heavyCount += q;
      if (line.specialty) t.specialty.push({ name: line.n, qty: q });
    });
    t.cuft = Math.round(t.cuft);
    t.lbs = Math.round(t.lbs);
    return t;
  }

  function pickCrew(cuft, settings) {
    var rows = settings.crew.slice().sort(function (a, b) { return a.maxCuft - b.maxCuft; });
    for (var i = 0; i < rows.length; i++) {
      if (cuft <= rows[i].maxCuft) return rows[i].movers;
    }
    return rows[rows.length - 1].movers;
  }

  function pickTruck(cuft, settings) {
    var factor = settings.truckLoadFactor || 0.85;
    var trucks = settings.trucks.slice().sort(function (a, b) {
      return a.capacityCuft - b.capacityCuft;
    });
    for (var i = 0; i < trucks.length; i++) {
      if (cuft <= trucks[i].capacityCuft * factor) return trucks[i];
    }
    return trucks[trucks.length - 1];
  }

  function accessPenaltyPct(access, settings) {
    var p = settings.productivity, pct = 0;
    ['origin', 'destination'].forEach(function (end) {
      var a = access[end] || {};
      if (a.type === 'stairs') pct += (a.flights || 1) * p.stairsFlightPenaltyPct;
      if (a.type === 'elevator') pct += p.elevatorPenaltyPct;
      if (a.longCarry) pct += p.longCarryPenaltyPct;
    });
    return pct;
  }

  function round(n) { return Math.round(n * 100) / 100; }
  function money(n) { return Math.round(n); }

  function calculate(job, settings) {
    var p = settings.productivity;
    var inv = totals(job.inventory || []);
    var cuft = inv.cuft;

    // --- crew ---
    var movers = pickCrew(cuft, settings);
    var crewBumped = false;
    var access = job.access || {};
    var hardAccess = ['origin', 'destination'].some(function (e) {
      var a = access[e] || {};
      return (a.type === 'stairs' && (a.flights || 1) >= 2) || a.longCarry;
    });
    if ((hardAccess || inv.heavyCount >= 3) && cuft > 250) {
      movers += 1;
      crewBumped = true;
    }
    var maxMovers = Math.max.apply(null, Object.keys(settings.hourlyRates).map(Number));
    if (movers > maxMovers) movers = maxMovers;

    // --- labor hours ---
    var baseHours = cuft / (p.cuftPerMoverPerHour * movers);
    var penaltyPct = accessPenaltyPct(access, settings);
    var laborHours = baseHours * (1 + penaltyPct / 100);

    var packingHours = 0;
    if (job.packing === 'full') packingHours = (cuft / 100) * p.packingHoursPer100Cuft;
    if (job.packing === 'fragile') packingHours = (cuft / 100) * p.packingHoursPer100Cuft * 0.4;
    laborHours += packingHours;

    if (laborHours < p.minimumHours) laborHours = p.minimumHours;
    laborHours = Math.round(laborHours * 4) / 4; // quarter hours

    // --- travel ---
    var tv = settings.travel;
    var driveMinutes = Math.max(job.driveMinutes || 0, tv.minimumTravelMinutes);
    var billedTravelMinutes = tv.doubleDriveTime ? driveMinutes * 2 : driveMinutes;
    var travelHours = Math.round((billedTravelMinutes / 60) * 4) / 4;

    var rate = settings.hourlyRates[String(movers)];
    var billableHours = laborHours + travelHours;
    var laborCost = billableHours * rate;

    // --- fees ---
    var lines = [];
    settings.fees.forEach(function (f) {
      if (f.auto) lines.push({ label: f.label, amount: f.amount });
    });
    var byId = {};
    settings.fees.forEach(function (f) { byId[f.id] = f; });

    if (['origin', 'destination'].some(function (e) { return (access[e] || {}).type === 'stairs'; })
        && byId.stairsFee) {
      lines.push({ label: byId.stairsFee.label, amount: byId.stairsFee.amount });
    }
    if (['origin', 'destination'].some(function (e) { return (access[e] || {}).longCarry; })
        && byId.longCarry) {
      lines.push({ label: byId.longCarry.label, amount: byId.longCarry.amount });
    }
    inv.specialty.forEach(function (s) {
      var key = /piano/i.test(s.name) ? 'piano'
              : /safe/i.test(s.name) ? 'safe'
              : /pool table/i.test(s.name) ? 'poolTable' : null;
      if (key && byId[key]) {
        lines.push({ label: byId[key].label, amount: byId[key].amount * s.qty });
      }
    });

    // --- protection ---
    if (job.tvProtection && inv.tvs > 0) {
      lines.push({
        label: 'TV crating and protection (' + inv.tvs + ')',
        amount: settings.protection.tvCratingPerTv * inv.tvs
      });
    }

    // --- materials ---
    var materialsTotal = 0;
    (job.materials || []).forEach(function (m) {
      var def = settings.materials.items.filter(function (x) { return x.id === m.id; })[0];
      if (def && m.qty) {
        materialsTotal += def.price * m.qty;
        lines.push({ label: def.label + ' x' + m.qty, amount: round(def.price * m.qty) });
      }
    });

    // --- long distance ---
    var longDistance = null;
    if ((job.miles || 0) > tv.longDistanceThresholdMiles) {
      longDistance = money(job.miles * tv.longDistanceRatePerMile);
      lines.push({ label: 'Long distance transport (' + Math.round(job.miles) + ' mi)', amount: longDistance });
    } else if (tv.mileageRatePerMile && job.miles) {
      lines.push({ label: 'Mileage', amount: money(job.miles * tv.mileageRatePerMile) });
    }

    var feesTotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var subtotal = laborCost + feesTotal;

    if (job.fullValueProtection) {
      var fvp = subtotal * (settings.protection.fullValueProtectionPctOfEstimate / 100);
      lines.push({ label: 'Full value protection', amount: money(fvp) });
      subtotal += fvp;
    }

    var pad = settings.quote.rangePaddingPct / 100;

    return {
      inventory: inv,
      movers: movers,
      crewBumped: crewBumped,
      truck: pickTruck(cuft, settings),
      hourlyRate: rate,
      laborHours: laborHours,
      travelHours: travelHours,
      billableHours: round(billableHours),
      driveMinutes: driveMinutes,
      doubleDriveTime: !!tv.doubleDriveTime,
      accessPenaltyPct: penaltyPct,
      laborCost: money(laborCost),
      lines: lines,
      materialsTotal: round(materialsTotal),
      total: money(subtotal),
      low: money(subtotal * (1 - pad)),
      high: money(subtotal * (1 + pad)),
      deposit: settings.quote.depositAmount
    };
  }

  window.ZaptQuote = { calculate: calculate, totals: totals, pickCrew: pickCrew, pickTruck: pickTruck };
})();

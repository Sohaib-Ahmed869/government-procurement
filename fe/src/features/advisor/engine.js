let API;


/* ===== src/engine.js ===== */
/* =============================================================================
 * Deterministic evaluation engine.
 * -----------------------------------------------------------------------------
 * Pure functions only: the same answers always produce the same result. No
 * network calls, no randomness, no model inference. Every item it emits carries
 * `basis` (source keys from the rule pack) and `confidence`.
 * ========================================================================== */

(function () {

  /* --- small helpers ------------------------------------------------------ */

  function has(list, v) { return Array.isArray(list) && list.indexOf(v) !== -1; }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-AU');
  }

  /* Pathway statuses, ordered strongest to weakest. */
  var STATUS = {
    mandatory: { rank: 0, label: 'Mandatory' },
    recommended: { rank: 1, label: 'Recommended' },
    available: { rank: 2, label: 'Available' },
    conditional: { rank: 3, label: 'Conditional' },
    unavailable: { rank: 4, label: 'Not available' }
  };

  function Result(rules, answers) {
    this.rules = rules;
    this.answers = answers;
    this.pathways = [];
    this.setAsides = [];
    this.obligations = [];
    this.flags = [];
    this.directNegotiation = null;
    this.headline = null;
  }

  Result.prototype.pathway = function (o) {
    this.pathways.push({
      id: o.id,
      title: o.title,
      status: o.status,
      statusLabel: STATUS[o.status].label,
      rank: STATUS[o.status].rank,
      summary: o.summary || '',
      reasons: o.reasons || [],
      basis: o.basis || [],
      confidence: o.confidence || 'medium'
    });
    return this;
  };

  Result.prototype.setAside = function (o) {
    this.setAsides.push({
      id: o.id, title: o.title, status: o.status, detail: o.detail,
      basis: o.basis || [], confidence: o.confidence || 'medium'
    });
    return this;
  };

  Result.prototype.obligation = function (o) {
    this.obligations.push({
      title: o.title, detail: o.detail, group: o.group || 'General',
      basis: o.basis || [], confidence: o.confidence || 'medium'
    });
    return this;
  };

  Result.prototype.flag = function (level, title, detail) {
    this.flags.push({ level: level, title: title, detail: detail });
    return this;
  };

  /* =========================================================================
   * NSW Government agency / NSW Health
   * ====================================================================== */

  /* The two accreditation levels differ in kind, not degree: level 2 has no
     prescribed maximum contract value at all, level 1 has a staggered one and
     must seek concurrence above it. Unaccredited is low-value-only. */
  function accreditationLine(level, value, T) {
    if (level === 'level-2') {
      return 'Level 2 accreditation: there is no prescribed maximum contract value, so you may run this on your own authority in line with your approved budget and your financial and procurement delegations. Your own agency rules and delegations still govern, and are often tighter than the whole-of-government bands above.';
    }
    if (level === 'level-1') {
      return 'Level 1 accreditation: you have a staggered risk- and spend-based maximum contract value and must seek concurrence once this procurement exceeds it. Confirm your current MCV before you commit to a method' +
        (value > T.level1RiskMcv
          ? ', and note that at ' + money(value) + ' this is over ' + money(T.level1RiskMcv) +
            ', so you must determine a risk-based MCV for this specific event using the level 1 decision tree (nine questions; a high-risk event carries a ' + money(T.level1RiskMcv) + ' MCV).'
          : '.');
    }
    if (level === 'not-accredited') {
      return 'Unaccredited: you are authorised to procure low-value contracts on your own authority, but above that you need assurance from an accredited agency or from NSW Procurement. A level 1 agency in your portfolio may be able to play that concurrence role.';
    }
    return 'Accreditation level not confirmed. It determines your maximum contract value and whether you need concurrence at all, establish it before you commit to a method.';
  }

  function evaluateAgency(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);
    var attrs = a.supplierAttrs || [];
    var isIct = a.category === 'ict-services' || a.category === 'ict-goods';
    var isProf = a.category === 'professional-services';
    var covered = a.eppCovered === 'yes' && value >= T.eppGoodsServices;
    var maybeCovered = a.eppCovered === 'unknown' && value >= T.eppGoodsServices;

    /* --- value band (unaccredited baseline; accredited agencies use their own) */
    var band;
    if (value < T.agencyAnySupplier) band = 'micro';
    else if (value < T.agencySingleQuote) band = 'low';
    else if (value < T.agencyThreeQuotes) band = 'mid';
    else band = 'high';
    r.band = band;

    /* --- set-asides and diversity policies -------------------------------
       The three direct engagement ceilings are NOT the same figure. */
    var aboriginalDirect = value <= T.aboriginalDirect;
    var smeDirect = value <= T.smeDirect;
    var regionalDirect = value <= T.regionalDirect;
    var directCeiling = aboriginalDirect || smeDirect || regionalDirect;

    r.setAside({
      id: 'app',
      title: 'Aboriginal Procurement Policy',
      status: has(attrs, 'aboriginal') && aboriginalDirect ? 'applies-direct'
        : aboriginalDirect ? 'applies-consider' : 'applies-participation',
      detail: (has(attrs, 'aboriginal') && aboriginalDirect
        ? 'You may negotiate directly with the Aboriginal business, the APP ceiling is ' + money(T.aboriginalDirect) +
          '. If a mandated whole-of-government arrangement or prequalification scheme covers this requirement, confirm how the APP interacts with that mandate before bypassing it, the APP text this tool carries does not itself authorise going outside a mandated arrangement. Verify the supplier\'s registration and still record a value-for-money assessment.'
        : aboriginalDirect
          ? 'At this value the APP permits direct negotiation with an Aboriginal business for procurements up to ' + money(T.aboriginalDirect) +
            '. The policy also says you should, whenever feasible, give first consideration to an Aboriginal business at this value. If a mandated arrangement covers the requirement, confirm the interaction before going outside it.'
          : 'Above the ' + money(T.aboriginalDirect) + ' direct engagement ceiling. Policy targets are 3% of the total number of goods and services contracts and 1% of cluster addressable spend.') +
        ' The APP covers all goods and services and construction with no exempt categories. At any value the policy says you SHOULD apply an Aboriginal participation non-price evaluation criterion, recommended, not mandatory, and no percentage is fixed.' +
        (value >= T.appParticipation
          ? ' At ' + money(T.appParticipation) + ' or above the mandatory participation requirements also bite, a minimum ' + T.appParticipationPct +
            '% Aboriginal participation requirement met through subcontracting, employment or capability-building, and an Aboriginal Participation Plan in the tender response that the successful supplier must implement. The obligations section sets out the three mechanisms.'
          : ''),
      basis: ['app'],
      confidence: 'medium'
    });

    var smeDetail;
    if (has(attrs, 'aboriginal') === false && has(attrs, 'regional') && !has(attrs, 'sme') && regionalDirect) {
      smeDetail = 'You may buy directly from this regional business, but note the regional ceiling is ' + money(T.regionalDirect) +
        ', not the ' + money(T.smeDirect) + ' that applies to SMEs. This procurement is within it.';
    } else if (!has(attrs, 'aboriginal') && has(attrs, 'regional') && !has(attrs, 'sme') && !regionalDirect) {
      smeDetail = 'Careful: the direct engagement ceiling for a regional business is ' + money(T.regionalDirect) +
        ', not ' + money(T.smeDirect) + '. At ' + money(value) + ' you are above it. The higher ceiling only applies if the supplier also qualifies as an SME (fewer than 200 FTE, Australian or NZ based).';
    } else if (has(attrs, 'sme') && smeDirect) {
      smeDetail = 'You may negotiate directly with and engage this SME up to ' + money(T.smeDirect) +
        ' for goods and services, excluding construction.';
    } else if (value >= T.smeParticipation) {
      smeDetail = 'At ' + money(T.smeParticipation) + ' or above, two requirements bite: suppliers must submit an SME and Local Participation Plan (contractually binding, reported quarterly), and two separate minimum allocations apply within the non-price criteria, 10% of non-price for SME participation and a further 10% of non-price for the government\'s economic, ethical, environmental and social priorities. Both are shares of the non-price component, not of the total score. See the evaluation section for what they are worth on your weighting.';
    } else {
      smeDetail = 'Direct engagement ceilings are ' + money(T.smeDirect) + ' for an SME and ' + money(T.regionalDirect) +
        ' for a regional business. At ' + money(T.smeParticipation) + ' or above an SME and Local Participation Plan and a 10% SME evaluation weighting become mandatory.';
    }

    r.setAside({
      id: 'sme',
      title: 'SME and Regional Procurement Policy',
      status: (has(attrs, 'sme') && smeDirect) || (has(attrs, 'regional') && regionalDirect) ? 'applies-direct'
        : value >= T.smeParticipation ? 'applies-plan' : 'applies-consider',
      detail: smeDetail,
      basis: ['sme', 'smeGuidance'],
      confidence: 'high'
    });

    if (has(attrs, 'ade')) {
      r.setAside({
        id: 'ade',
        title: 'Australian Disability Enterprise',
        status: 'applies-direct',
        detail: 'You may buy from an Australian Disability Enterprise at any contract value, provided you obtain a quote and can demonstrate value for money. There is no dollar ceiling on this pathway.',
        basis: ['ade'],
        confidence: 'medium'
      });
    }

    if (has(attrs, 'social') && !has(attrs, 'ade') && !has(attrs, 'aboriginal')) {
      r.setAside({
        id: 'social',
        title: 'Social enterprise',
        status: 'no-mechanism',
        detail: 'NSW has no standalone preference mechanism for social enterprises. The supplier only gets favourable treatment if it also qualifies as an Aboriginal business, an SME, a regional business or an Australian Disability Enterprise.',
        basis: ['sustainability'],
        confidence: 'medium'
      });
    }

    /* --- pathway: exercise an existing option ---------------------------- */
    if (a.incumbent === 'options-remaining') {
      r.pathway({
        id: 'extend', title: 'Exercise the existing extension option',
        status: 'available',
        summary: 'Cheapest and fastest route if the option is genuine and priced.',
        reasons: [
          'Exercising a pre-agreed option is contract management, not a new procurement, no fresh approach to market is required.',
          'Confirm the option was included in the value approved at the original award. If the whole-of-life value including this option now exceeds a threshold that was not tested at award, the extension is exposed.',
          'Record a current value-for-money assessment before exercising: benchmark pricing, verify performance, and confirm the market has not moved.'
        ],
        basis: ['gsf', 'pbd2021_04'],
        confidence: 'medium'
      });
    } else if (a.incumbent === 'expired') {
      r.flag('stop', 'The incumbent contract has expired',
        'Continuing to receive services under an expired contract leaves you without contractual protection and is an audit finding waiting to happen. Treat this as a new procurement and, if you need continuity, document a short bridging arrangement with the grounds and delegate approval on file.');
    }

    /* --- pathway: whole-of-government ------------------------------------ */
    if (a.arrangement === 'wog') {
      r.pathway({
        id: 'wog', title: 'Buy under the mandatory whole-of-government contract',
        status: 'mandatory',
        summary: 'A mandated arrangement covers this requirement.',
        reasons: [
          'Where a mandatory whole-of-government arrangement covers the requirement, agencies must use it.',
          'Not using it requires going through the Exceptions Framework in PBD-2021-04.',
          'Entering into a new whole-of-government contract requires the responsible Minister\'s approval.',
          value <= T.wogExemptBelow
            ? 'Up to ' + money(T.wogExemptBelow) + ' (inclusive) any agency may contract any supplier even where the goods or services are available on a whole-of-government arrangement.'
            : null,
          (has(attrs, 'aboriginal') && aboriginalDirect) || (has(attrs, 'sme') && smeDirect) || (has(attrs, 'regional') && regionalDirect)
            ? 'Exception that helps you: the set-aside direct engagement pathway remains open even though a whole-of-government arrangement exists.'
            : null
        ].filter(Boolean),
        basis: ['pbd2021_04', 'sme', 'app'],
        confidence: 'high'
      });
    }

    /* --- pathway: prequalification scheme -------------------------------- */
    if (isIct) {
      r.pathway({
        id: 'scheme-ict', title: 'Source from the ICT Services Scheme (SCM0020)',
        status: a.arrangement === 'wog' ? 'available' : 'mandatory',
        summary: 'NSW agencies must buy ICT/digital goods and services from prequalified SCM0020 suppliers.',
        reasons: [
          'Use of the ICT Purchasing Framework and the mandatory ICT Services Scheme is mandated for agency ICT procurement.',
          'PBD-2026-01 (20 February 2026) is the current direction and supersedes PBD-2025-01. It sets separate thresholds and processes for ICT consultancy services and for all other ICT goods and services, identify which of the two you are buying before you pick a method.',
          'If this is an ICT consultancy engagement, it must also comply with the current professional services direction regardless of your accreditation level or the engagement value, and additional conditions and governance apply where it does not comply with the ICT Consulting Commercial Framework.',
          'The scheme is the supplier pool, it does not remove the need for a competitive process proportionate to value, or for a documented value-for-money assessment.'
        ],
        basis: ['pbd2025_03', 'pbd2026_01', 'pbd2026_02', 'schemeIct'],
        confidence: 'high'
      });
    } else if (isProf) {
      r.pathway({
        id: 'scheme-pms', title: 'Source from the Performance and Management Services Scheme (SCM0005)',
        status: a.arrangement === 'wog' ? 'available' : 'recommended',
        summary: 'The standing prequalification scheme for consulting and management services.',
        reasons: [
          'PBD-2026-02 is the current direction governing engagement of professional services suppliers. It supersedes the earlier chain (PBD-2021-03, PBD-2023-05/06, PBD-2025-02), check the current approval and reporting requirements, not an older summary.',
          'Using prequalified suppliers removes the need to re-test capability, insurance and standard terms.',
          'Consultancy engagements attract additional scrutiny and reporting. Confirm the engagement is not work that should be done in-house.'
        ],
        basis: ['pbd2026_02', 'schemePms'],
        confidence: 'medium'
      });
    } else if (a.arrangement === 'scheme') {
      r.pathway({
        id: 'scheme', title: 'Source from the applicable panel or prequalification scheme',
        status: 'recommended',
        summary: 'An existing arrangement covers this requirement.',
        reasons: [
          'Buying from an established scheme or panel gives you pre-tested suppliers and standard terms.',
          'Still run a competitive process within the scheme proportionate to the value.'
        ],
        basis: ['pbd2021_04'],
        confidence: 'medium'
      });
    }

    /* --- pathway: quotes -------------------------------------------------- */
    if (band !== 'high') {
      var quoteTitle, quoteSummary;
      if (band === 'micro') {
        quoteTitle = 'Buy from any supplier at reasonable market rates';
        quoteSummary = 'Under ' + money(T.agencyAnySupplier) + ' you may purchase from any supplier, provided the rates are reasonable and consistent with normal market rates.';
      } else if (band === 'low') {
        quoteTitle = 'Obtain at least one written quotation';
        quoteSummary = 'Between ' + money(T.agencyAnySupplier) + ' and ' + money(T.agencySingleQuote) + ' the requirement is one written quotation.';
      } else {
        quoteTitle = 'Obtain at least three written quotations';
        quoteSummary = 'Between ' + money(T.agencySingleQuote) + ' and ' + money(T.agencyThreeQuotes) +
          ' the requirement is three written quotations, or an appropriate procurement process approved by the agency head or an accredited agency within the cluster.';
      }

      r.pathway({
        id: 'quotes',
        title: quoteTitle,
        status: (a.arrangement === 'wog' || isIct) ? 'available' : 'recommended',
        summary: quoteSummary,
        reasons: [
          'These are the value bands that apply to an unaccredited agency: under ' + money(T.agencyAnySupplier) +
            ', any supplier at reasonable market rates; ' + money(T.agencyAnySupplier) + ' to ' + money(T.agencySingleQuote) +
            ', at least one written quotation; ' + money(T.agencySingleQuote) + ' to ' + money(T.agencyThreeQuotes) +
            ', at least three written quotations or an approved procurement process.',
          accreditationLine(a.accreditation, value, T),
          band === 'mid'
            ? 'Note the three-quote band runs all the way to ' + money(T.agencyThreeQuotes) + ', the same figure as the covered procurement threshold. It does not stop at ' + money(T.smeDirect) + '.'
            : null,
          'Record the quotes, the evaluation and the value-for-money conclusion even though no tender is required.'
        ].filter(Boolean),
        basis: ['lowValue', 'pbd2021_04', 'accreditation', 'contractLimits', 'ppf'],
        confidence: 'high'
      });
    }

    /* --- pathway: open approach to market -------------------------------- */
    var openStatus;
    if (covered) openStatus = 'mandatory';
    else if (band === 'high') openStatus = a.arrangement === 'wog' ? 'available' : 'recommended';
    else openStatus = 'available';

    r.pathway({
      id: 'open', title: 'Open approach to market (open tender on buy.nsw)',
      status: openStatus,
      summary: covered
        ? 'This is a covered procurement, an open approach is the default and limited tendering is tightly constrained.'
        : 'The default competitive route where no arrangement covers the requirement.',
      reasons: [
        covered
          ? 'At ' + money(value) + ' this meets or exceeds the ' + money(T.eppGoodsServices) + ' (ex GST) covered procurement threshold for goods and other services, and the agency is listed in Schedule 2 of PBD-2019-05, so the enforceable procurement provisions apply in full.'
          : maybeCovered
            ? 'At ' + money(value) + ' this is at or above the ' + money(T.eppGoodsServices) + ' covered procurement threshold. You have not confirmed whether the agency is in Schedule 2 of PBD-2019-05, check before you choose a method, because it changes what is permissible.'
            : 'At ' + money(value) + ' a competitive open process is the defensible default absent a covering arrangement.',
        'When estimating value you must include the goods and services themselves, any options, extensions or renewals, all remuneration including premiums, fees, interest and commissions, and all revenue streams provided for in the contract.',
        'All open tender opportunities must be published on buy.nsw irrespective of value.',
        covered
          ? 'The minimum tender period depends on whether the procurement is covered and how you approach the market. A covered procurement may be run on 10 calendar days only where the goods or services are commercial items routinely sold to business for non-government purposes, you published an open approach within the last 12 months for substantially similar goods or services, and you included a notice in an annual procurement plan published on Tenders at least 40 days beforehand. If you do not meet all three, do not use the shortened period.'
          : '25 calendar days is recommended in any situation where you publish the tender on buy.nsw Tenders. That is a recommendation rather than a floor for a non-covered procurement, but shortening it is a decision you should be able to justify.',
        accreditationLine(a.accreditation, value, T)
      ].filter(Boolean),
      basis: covered || maybeCovered
        ? ['pbd2019_05', 'eppGuidance', 'tenderProcess', 'pbd2025_04', 'accreditation']
        : ['pbd2021_04', 'pbd2025_04', 'tenderProcess', 'accreditation'],
      confidence: 'high'
    });

    /* --- pathway: limited tender / direct negotiation -------------------- */
    evaluateAgencyDirect(r, {
      value: value, band: band, covered: covered, maybeCovered: maybeCovered, attrs: attrs,
      directCeiling: directCeiling, aboriginalDirect: aboriginalDirect,
      smeDirect: smeDirect, regionalDirect: regionalDirect
    });

    /* --- obligations ------------------------------------------------------ */
    agencyObligations(r, { value: value, isIct: isIct, isProf: isProf, covered: covered, band: band });
  }

  function evaluateAgencyDirect(r, ctx) {
    var a = r.answers, T = r.rules.thresholds;
    /* Belt and braces with the app-layer pruning: the grounds question is
       only shown when the buyer wants direct negotiation, so a stale answer
       carried in from elsewhere must not tilt the verdict. */
    var grounds = a.wantDirect === true ? (a.soleGrounds || []) : [];
    /* The buyer worked through the sole-source grounds — reflect what they
       identified back into the justification instead of ignoring it. */
    var GROUND_LABELS = {
      'unique-technical': 'only one supplier can deliver for genuine technical reasons',
      'ip': 'protection of exclusive rights such as intellectual property',
      'compatibility': 'compatibility with existing equipment or services, where a change of supplier would duplicate cost',
      'urgency': 'urgency',
      'emergency': 'emergency',
      'no-responses': 'a prior open approach produced no suitable submissions'
    };

    var permitted = [];
    var conditions = [];
    var verdict, summary, basis = [], confidence = 'medium';

    /* Set-aside routes come first — they are the cleanest grounds. Note the
       three ceilings are different figures: Aboriginal 250k, SME 250k,
       regional 150k. */
    if (ctx.aboriginalDirect && has(ctx.attrs, 'aboriginal')) {
      permitted.push('Direct negotiation with an Aboriginal business for procurements up to ' + money(T.aboriginalDirect) + ' under the Aboriginal Procurement Policy. If a mandated whole-of-government arrangement or scheme covers this requirement, confirm how the APP interacts with that mandate before going outside it, the policy text this tool carries does not itself authorise bypassing a mandated arrangement.');
      basis.push('app');
    }
    if (ctx.smeDirect && has(ctx.attrs, 'sme')) {
      permitted.push('Direct negotiation with an SME up to ' + money(T.smeDirect) + ' for goods and services (excluding construction) under the SME and Regional Procurement Policy.');
      basis.push('sme');
    }
    if (ctx.regionalDirect && has(ctx.attrs, 'regional') && !has(ctx.attrs, 'sme')) {
      permitted.push('Direct negotiation with a regional business up to ' + money(T.regionalDirect) + ' under the SME and Regional Procurement Policy. Note this ceiling is lower than the ' + money(T.smeDirect) + ' that applies to SMEs.');
      basis.push('sme');
    }
    if (has(ctx.attrs, 'ade')) {
      permitted.push('Direct purchase from an Australian Disability Enterprise at any value, subject to obtaining a quote and demonstrating value for money.');
      basis.push('ade');
    }
    if (ctx.band === 'micro') {
      permitted.push('Under ' + money(T.agencyAnySupplier) + ' you may buy from any supplier provided the rates are reasonable and consistent with normal market rates, including where the requirement is available on a whole-of-government arrangement.');
      basis.push('pbd2021_04', 'lowValue');
    } else if (ctx.band === 'low') {
      permitted.push('Between ' + money(T.agencyAnySupplier) + ' and ' + money(T.agencySingleQuote) + ' the approved arrangement is a single written quotation, so a single supplier is permissible.');
      basis.push('lowValue');
    }
    if (a.incumbent === 'options-remaining') {
      permitted.push('Exercising an unexercised extension option in the existing contract is not a new procurement, provided the option was priced and approved at award.');
      basis.push('gsf');
    }

    /* Covered procurement: only clause 15 grounds. An UNKNOWN Schedule 2
       status runs this branch too — the permissive reading must be earned by
       answering "no", not defaulted into by not knowing. */
    if (ctx.covered || ctx.maybeCovered) {
      var cl15 = [];
      if (has(grounds, 'unique-technical')) cl15.push('only one supplier can supply and, for technical reasons, there is no reasonable alternative or substitute');
      if (has(grounds, 'ip')) cl15.push('protection of exclusive rights such as intellectual property');
      if (has(grounds, 'compatibility')) cl15.push('additional supply where a change of supplier would duplicate cost, cause significant inconvenience, or is not possible for technical reasons');
      if (has(grounds, 'urgency') || has(grounds, 'emergency')) cl15.push('extreme urgency brought about by genuinely unforeseen events, where the goods or services cannot be obtained in time under an open approach');
      if (has(grounds, 'no-responses')) cl15.push('an open approach was made and produced no suitable submissions');

      if (cl15.length) {
        verdict = 'conditional';
        summary = 'Limited tendering is available, but only on the clause 15 grounds you have identified, and the delegate must be satisfied the ground is genuinely made out on the facts.';
        conditions.push('Record which limb of clause 15 of PBD-2019-05 you rely on, with the evidence for it, before you approach the supplier.');
        conditions.push('Clause 15 is exhaustive. Convenience, an existing relationship, time pressure of your own making, or a preference for the incumbent are not grounds.');
        conditions.push('The limited tendering grounds were amended on 11 July 2025 to align more closely with the Commonwealth Procurement Rules, read the current clause, not an older summary.');
        permitted = permitted.concat(cl15.map(function (g) { return 'Clause 15 of PBD-2019-05: ' + g + '.'; }));
      } else if (permitted.length) {
        verdict = 'conditional';
        summary = 'A set-aside or contractual route is open to you, but note this is also a covered procurement, confirm the set-aside route is consistent with PBD-2019-05 before relying on it at this value.';
        conditions.push('At ' + money(ctx.value) + ' this exceeds the covered procurement threshold. Get advice on the interaction between the set-aside pathway and the enforceable procurement provisions before proceeding.');
      } else {
        verdict = 'not-permitted';
        summary = 'This is a covered procurement and none of the clause 15 limited tendering grounds are made out. An open approach to market is required.';
        conditions.push('If you believe a clause 15 ground applies, revisit your answers, the grounds are narrow and evidence-based.');
      }
      if (ctx.maybeCovered) {
        conditions.unshift('You answered that you do not know whether the agency is in Schedule 2 of PBD-2019-05, so the covered-procurement rules have been applied as the safe course. If you confirm the agency is NOT listed, re-run this assessment, more routes may open up.');
      }
      basis.push('pbd2019_05', 'eppGuidance');
      confidence = ctx.maybeCovered ? 'low' : 'medium';
    } else if (permitted.length) {
      verdict = 'permitted';
      summary = 'Direct engagement is available to you on the grounds below without needing an exemption.';
      conditions.push('You still have to demonstrate and record value for money, a permitted pathway is not a substitute for a price and capability assessment.');
      conditions.push('Confirm the supplier\'s eligibility (registration as an Aboriginal business, SME headcount, regional presence) rather than taking it on trust.');
    } else if (ctx.band === 'mid') {
      verdict = 'conditional';
      summary = 'Between ' + money(T.agencySingleQuote) + ' and ' + money(T.agencyThreeQuotes) + ' the expected process is three written quotations. Going to a single supplier is a departure that has to be justified and approved.';
      conditions.push('Either obtain three written quotations, or run an appropriate procurement process approved by the agency head or an accredited agency within the cluster.');
      conditions.push('If you go to a single supplier, document why no competitive process can deliver the outcome and get delegate approval before you engage.');
      conditions.push(a.accreditation === 'level-2'
        ? 'As a level 2 agency you have no prescribed maximum contract value, so concurrence is not triggered by value alone, but the departure from three quotations still needs delegate approval.'
        : 'Check your agency\'s maximum contract value and the NSW Procurement Concurrence Policy, concurrence may be required.');
      basis.push('lowValue', 'concurrence', 'accreditation');
      confidence = 'medium';
    } else {
      verdict = 'conditional';
      summary = 'At ' + money(ctx.value) + ' and outside a set-aside pathway, direct negotiation needs a documented single-source justification and delegate approval.';
      if (grounds.length) {
        conditions.push('Build the justification on the grounds you identified, ' +
          grounds.map(function (g) { return GROUND_LABELS[g] || g; }).join('; ') +
          ', with the evidence for each. Naming a ground is the start of the justification, not the end of it.');
      }
      conditions.push('Prepare a single-source justification setting out why no competitive process can deliver the outcome, and have it approved by the appropriate delegate before you engage.');
      conditions.push(a.accreditation === 'level-2'
        ? 'As a level 2 agency you have no prescribed maximum contract value, so concurrence is not triggered by value alone, but the single-source justification and delegate approval still are.'
        : 'Check the NSW Procurement Concurrence Policy and your maximum contract value, concurrence may be required before you proceed.');
      conditions.push('You answered that the agency is not in Schedule 2 of PBD-2019-05. If that turns out to be wrong, the far narrower clause 15 grounds apply instead, worth a final check before you commit.');
      basis.push('concurrence', 'pbd2021_04');
      confidence = 'low';
    }

    if (has(grounds, 'emergency')) {
      conditions.push('Emergency provisions are time-limited and scope-limited. Cover only what the emergency requires, and plan the compliant replacement procurement now.');
    }

    r.directNegotiation = {
      verdict: verdict, summary: summary, grounds: permitted,
      conditions: conditions, basis: basis, confidence: confidence
    };

    r.pathway({
      id: 'direct',
      title: ctx.covered ? 'Limited tender / direct negotiation' : 'Direct negotiation with a single supplier',
      status: verdict === 'permitted' ? 'available' : verdict === 'conditional' ? 'conditional' : 'unavailable',
      summary: summary,
      reasons: permitted.length ? permitted : conditions,
      basis: basis,
      confidence: confidence
    });
  }

  function agencyObligations(r, ctx) {
    var a = r.answers, T = r.rules.thresholds;

    r.obligation({
      group: 'Approval and record',
      title: 'Value for money assessment on file',
      detail: 'Whatever pathway you use, the delegate must be able to point to a written value-for-money conclusion. Under the GSF Act the duty is to use resources efficiently, effectively and economically.',
      basis: ['gsf', 'pwpa'], confidence: 'medium'
    });

    var inclGst = ctx.value * (r.rules.gst || 1.1);
    if (inclGst >= T.gipaDisclosureInclGst) {
      r.obligation({
        group: 'Disclosure',
        title: 'Register of government contracts',
        detail: 'At ' + money(ctx.value) + ' ex GST this is about ' + money(inclGst) + ' including GST, over the ' +
          money(T.gipaDisclosureInclGst) + ' GST-inclusive disclosure threshold, so it must be entered in the contracts register within 45 working days of coming into effect. ' +
          'Class 1 is any contract of ' + money(T.gipaDisclosureInclGst) + ' or more incl GST. Class 2 is a contract between ' +
          money(T.gipaDisclosureInclGst) + ' and ' + money(T.gipaClass3InclGst) +
          ' incl GST that was not awarded through a tender process, or was awarded from a tender whose terms were substantially negotiated with the successful bidder. ' +
          (inclGst >= T.gipaClass3InclGst
            ? 'At this value, if it is a class 2 contract it is a class 3 contract, you must publish a copy of the contract itself.'
            : 'A class 2 contract of ' + money(T.gipaClass3InclGst) + ' or more incl GST becomes class 3, requiring publication of the contract itself.') +
          ' NOTE: the GST-inclusive figure here is estimated by multiplying your ex-GST value by 1.1, if the supply is partly GST-free the true figure is lower, so check the actual contract value against the threshold when you are near it.',
        basis: ['gipa'], confidence: 'medium'
      });
    }

    r.obligation({
      group: 'Publication',
      title: 'Publish on buy.nsw',
      detail: 'All open tender opportunities must be published on buy.nsw irrespective of value, agencies had until 1 July 2026 to comply. Suppliers must be registered on the buy.nsw Supplier Hub.',
      basis: ['pbd2025_04', 'pbd2023_04'], confidence: 'high'
    });

    r.obligation({
      group: 'Supply chain',
      title: 'Modern slavery due diligence',
      detail: 'Take reasonable steps to ensure the goods and services are not the product of modern slavery. The Anti-slavery Commissioner\'s Guidance on Reasonable Steps has been operative since 1 January 2024, scale the diligence to the risk profile of the category and supply chain, and keep the assessment on file.',
      basis: ['modernSlavery', 'reasonableSteps'], confidence: 'high'
    });

    if (inclGst >= T.modernSlaveryReportInclGst) {
      r.obligation({
        group: 'Supply chain',
        title: 'Anti-slavery Commissioner contract report',
        detail: 'Since 1 July 2024, where a contract of ' + money(T.modernSlaveryReportInclGst) +
          ' including GST or more arises from a "heightened" modern slavery due diligence procurement process, an online report must be filed with the Office of the Anti-slavery Commissioner within 45 days of the contract entering into force. This contract is over that value threshold, determine whether your process was a heightened one. The quoted source for this obligation is expressed for councils; the Guidance on Reasonable Steps is understood to reach agencies too, but confirm the agency-side requirement at source.',
        basis: ['reasonableSteps'], confidence: 'medium'
      });
    }

    r.obligation({
      group: 'Supplier restrictions',
      title: 'KPMG procurement restrictions',
      detail: 'PBD-2026-03 (issued 17 June 2026) suspends new procurements involving KPMG and imposes an approval and reporting process for engagements under existing in-flight procurements and for extensions, renewals or variations of existing engagements. If the intended supplier is KPMG or any entity in Attachment A to that direction, stop and follow the direction before proceeding.',
      basis: ['pbd2026_03'], confidence: 'high'
    });

    if (ctx.isProf || ctx.isIct) {
      r.flag('warn', 'Check the supplier against the KPMG restrictions',
        'You are buying professional or ICT services, which is where PBD-2026-03 bites hardest. New procurements involving KPMG are suspended, and extensions, renewals or variations of existing KPMG engagements need approval and reporting. Check the intended supplier against Attachment A to the direction before you approach the market.');
    }

    r.obligation({
      group: 'Supply chain',
      title: 'Supplier Code of Conduct',
      detail: 'The NSW Government Supplier Code of Conduct applies to the supplier and its own supply chain. Reference it in the contract.',
      basis: ['supplierCode'], confidence: 'medium'
    });

    r.obligation({
      group: 'Sustainability',
      title: 'Sustainability and net zero',
      detail: 'Weight environmental and social outcomes in the evaluation. The Climate Change (Net Zero Future) Act 2023 sets the State\'s emissions objectives and increasingly shapes category strategy.',
      basis: ['sustainability'], confidence: 'low'
    });

    if (ctx.isIct) {
      var sens = a.dataSensitivity;
      if (sens && sens !== 'none') {
        r.obligation({
          group: 'ICT',
          title: 'Cyber security and data classification',
          detail: 'Data classified ' + (sens === 'personal' ? 'as personal or health information' : sens.toUpperCase()) +
            ' requires security controls matched to that classification, and a risk assessment covering supplier access, storage and maintenance. Build the controls into the contract, not just the evaluation.' +
            (sens === 'personal' ? ' Privacy obligations under PPIP/HRIP also attach, confirm whether a privacy impact assessment is required.' : ''),
          basis: ['cyber'], confidence: 'medium'
        });
      }
      if (a.offshore === true) {
        r.flag('warn', 'Offshore data storage or access',
          'You have indicated government data will be stored or accessed offshore. Data sovereignty expectations generally require NSW Government data to remain onshore. Confirm the position and get it approved explicitly before you go to market, retrofitting it after award is expensive.');
      }
      if (a.ictProject === true) {
        r.obligation({
          group: 'ICT',
          title: 'ICT Assurance Framework gate',
          detail: 'State-funded ICT projects of ' + money(T.iafIctProject) + ' and above are subject to the ICT Assurance Framework. Engage Digital NSW on assurance before the approach to market, not after.',
          basis: ['iaf'], confidence: 'medium'
        });
      }
    }

    if (ctx.value >= T.smeParticipation) {
      r.obligation({
        group: 'Policy',
        title: 'SME and Local Participation Plan, and 10% SME evaluation weighting',
        detail: 'For goods and services procurements over ' + money(T.smeParticipation) +
          ', suppliers must submit an SME and Local Participation Plan. The plan is contractually binding on the successful respondent and must be reported against quarterly, number of SME subcontractors, value of goods and services procured from SMEs, and percentage of contract spend with SMEs. ' +
          'Non-price evaluation criteria of at least 10% must address government objectives (economic, ethical, environmental and social), with a minimum 10% allocated to assessing how the supplier will support SMEs.',
        basis: ['sme', 'smeGuidance'], confidence: 'high'
      });
    }
    r.obligation({
      group: 'Evaluation',
      title: 'Aboriginal participation evaluation criterion (recommended, not mandatory)',
      detail: 'The policy says agencies SHOULD apply an Aboriginal participation non-price evaluation criterion so responses can also be evaluated on their social commitments. It is recommended practice, not a mandatory criterion, and no percentage is fixed for it. Departing from it is a decision you can make, just make it deliberately and record why. Note the contrast with the SME and government-objectives allocations above $3 million, which are mandatory minimums.',
      basis: ['app'], confidence: 'high'
    });

    if (ctx.value >= T.appParticipation) {
      r.obligation({
        group: 'Policy',
        title: 'Minimum ' + T.appParticipationPct + '% Aboriginal participation and Participation Plan',
        detail: 'At ' + money(T.appParticipation) + ' or above you MUST include a minimum ' + T.appParticipationPct +
          '% Aboriginal participation requirement. It can be met by any one or a combination of three mechanisms: at least ' +
          T.appParticipationPct + '% of the contract value subcontracted to Aboriginal businesses; at least ' + T.appParticipationPct +
          '% of the contract\'s Australian-based workforce (FTE) directly contributing to the contract being Aboriginal employees; or at least ' +
          T.appParticipationPct + '% of the contract value applied to education, training or capability-building for Aboriginal staff or businesses directly contributing to the contract. ' +
          'Tenderers must submit an Aboriginal Participation Plan setting out how they will meet it, and the successful supplier must implement that plan.',
        basis: ['app'], confidence: 'high'
      });
    }
    r.obligation({
      group: 'Payment',
      title: 'Faster Payment Terms, 5 business days for registered small businesses',
      detail: 'If the supplier is a registered small business (Australian or NZ based, fewer than 20 FTE, registered on the buy.nsw Supplier Hub), in-scope agencies must pay correctly rendered invoices up to ' + money(T.fpSmallBizInvoiceCap) + ' within 5 business days. Set the payment terms in the contract to match, discovering the obligation at invoice time is too late.',
      basis: ['fasterPayment'], confidence: 'medium'
    });

    if (ctx.value >= T.sbShorterPayments) {
      r.obligation({
        group: 'Payment',
        title: 'Small Business Shorter Payment Terms, build 20-day subcontractor terms into the head contract',
        detail: 'At ' + money(T.sbShorterPayments) + ' or above, if the head contractor is a large business you must require it to identify its direct small business subcontractors, tell them about the policy, put 20-business-day payment terms in those subcontracts, and actually pay within 20 business days of a correctly rendered invoice. This is a contract-design obligation, it has to be drafted into the head contract before award, and it shares its trigger with the Aboriginal participation requirements above.',
        basis: ['shorterPayment'], confidence: 'medium'
      });
    }

    if (a.accreditation === 'unknown') {
      r.flag('warn', 'Accreditation level not confirmed',
        'There are two accreditation levels and they differ in kind. A level 2 agency has no prescribed maximum contract value and needs no concurrence on value grounds. A level 1 agency has a staggered risk- and spend-based MCV and must seek concurrence above it. An unaccredited agency can only procure low-value contracts on its own authority. Establish which applies before you commit to a method.');
    }
    if (a.accreditation === 'level-1' && ctx.value > T.level1RiskMcv) {
      r.obligation({
        group: 'Approval and record',
        title: 'Level 1 risk-based MCV determination',
        detail: 'At ' + money(ctx.value) + ' this exceeds ' + money(T.level1RiskMcv) +
          ', so as a level 1 agency you must determine a risk-based maximum contract value for this specific procurement using the decision tree, nine questions assessing the event\'s risks. A high risk event carries a ' +
          money(T.level1RiskMcv) + ' MCV. Do this before the approach to market, and seek concurrence if the event exceeds the MCV it produces.',
        basis: ['level1DecisionTree', 'accreditationProgram'], confidence: 'high'
      });
    }
    if (a.accreditation === 'not-accredited' && ctx.band !== 'micro' && ctx.band !== 'low') {
      r.obligation({
        group: 'Approval and record',
        title: 'Assurance from an accredited agency',
        detail: 'Unaccredited agencies are authorised to procure low-value contracts. At ' + money(ctx.value) +
          ' you are above that, so you need assurance from an accredited agency or from NSW Procurement. A level 1 agency within your portfolio may play that concurrence role in line with its own authority to procure.',
        basis: ['accreditation', 'accreditationProgram', 'concurrence'], confidence: 'high'
      });
    }
    if (a.buyerType === 'nsw-health') {
      r.flag('info', 'NSW Health has its own layer',
        'NSW Health entities are government agencies, so Procurement Board Directions apply, but NSW Health procurement policy directives and HealthShare NSW whole-of-health contracts sit on top. Check both before you settle the approach.');
    }
  }

  /* =========================================================================
   * NSW local council
   * ====================================================================== */

  function evaluateCouncil(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);
    /* The s 55 threshold is expressed INCLUSIVE of GST; the user enters ex-GST. */
    var valueInclGst = value * (r.rules.gst || 1.1);
    var threshold = a.councilStaffServices === true ? T.councilTenderStaffServices : T.councilTenderInclGst;
    var mustTender = valueInclGst >= threshold;
    r.band = mustTender ? 'tender' : 'below-threshold';
    r.councilThreshold = threshold;

    r.flag('info', 'The council threshold is GST-inclusive',
      'You entered ' + money(value) + ' ex GST, which is about ' + money(valueInclGst) +
      ' including GST. The s 55 threshold of ' + money(T.councilTenderInclGst) +
      ' is the estimated expenditure under the proposed contract inclusive of GST, so that is the figure compared here. ' +
      (mustTender
        ? 'On that basis a tender is required.'
        : 'On that basis a tender is not required, but note that a contract you think of as being just under ' +
          money(T.councilTenderInclGst) + ' ex GST is actually over the threshold once GST is added.'));

    if (a.councilStaffServices === true) {
      r.flag('warn', 'Lower threshold applied, but not confirmed',
        'You indicated this is a contract for services currently provided by council employees. A lower prescribed threshold of ' +
        money(T.councilTenderStaffServices) + ' is widely cited for these contracts and has been applied here, but it could NOT be verified against the current Local Government (General) Regulation 2021, searches of the official sources returned ' +
        money(T.councilTenderStaffServices) + ' only as a historical general threshold. Confirm the current prescribed amount before you rely on this. If the lower threshold does not apply, the ordinary ' +
        money(T.councilTenderInclGst) + ' threshold governs.');
    }

    /* --- below threshold -------------------------------------------------- */
    if (!mustTender) {
      r.pathway({
        id: 'council-policy', title: 'Quotes under the council\'s own procurement policy',
        status: 'recommended',
        summary: 'Below ' + money(threshold) + ' the Local Government Act does not require a tender.',
        reasons: [
          'Section 55(3)(n)(i) exempts contracts involving estimated expenditure or receipt of less than ' + money(T.councilTenderInclGst) + ' incl GST (or another prescribed amount) from the tendering requirement in s 55(1).',
          'Your council\'s own procurement policy sets the quote thresholds that apply below the statutory threshold, those are binding on you even though the Act is silent. Check them.',
          'Value the whole contract including options. Splitting a requirement to stay under ' + money(threshold) + ' is a breach, not a workaround.'
        ],
        basis: ['lga55', 'olg'], confidence: 'high'
      });
    }

    /* --- tender required -------------------------------------------------- */
    r.pathway({
      id: 'council-tender', title: 'Invite tenders under s 55',
      status: mustTender ? 'mandatory' : 'available',
      summary: mustTender
        ? 'At ' + money(value) + ' ex GST (about ' + money(valueInclGst) + ' including GST) this meets the GST-inclusive ' + money(threshold) + ' threshold, so s 55(1) requires a tender unless an exemption in s 55(3) applies.'
        : 'Not required at this value, but open to you if the market or risk profile warrants it.',
      reasons: [
        'You must choose between three tendering methods: open tendering by public advertisement; selective tendering following public advertisement asking for expressions of interest; and selective tendering using recognised contractors selected from a council-prepared list.',
        'Open tendering is the default and the most defensible. Use selective tendering by EOI where the market is broad and you need to shortlist on capability first.',
        'The deadline for submissions must be at least 21 days after the date of first publication of the advertisement, and under the Interpretation Act the day of publication is excluded from that reckoning. The same 21 days applies to an expression of interest.',
        'The tender must be evaluated against the criteria you published, and accepted (or all tenders declined) by the council or its delegate.',
        'If the council declines all tenders, s 55 sets out what it may then do, including negotiating, but only after a resolution and only within the limits the Act allows.'
      ],
      basis: ['lga55', 'lgReg', 'lgTendering', 'olg'],
      confidence: 'high'
    });

    /* --- exemptions ------------------------------------------------------- */
    if (a.arrangement === 'lgp' || a.arrangement === 'wog') {
      r.pathway({
        id: 'council-prescribed', title: 'Buy through an approved / prescribed arrangement',
        status: 'available',
        summary: 'Purchasing through a prescribed arrangement is exempt from the s 55 tender requirement.',
        reasons: [
          'Section 55(3) exempts a contract for goods, materials or services specified by the NSW Procurement Board (or the relevant Commonwealth body), made with a person so specified.',
          'This is the limb councils commonly rely on to buy through Local Government Procurement and NSW Government contracts. Confirm the specific arrangement is actually covered, not every aggregator arrangement is.',
          'You still need to run a competitive process within the arrangement proportionate to value, and demonstrate value for money.'
        ],
        basis: ['lga55', 'lgp'], confidence: 'medium'
      });
    } else if (mustTender) {
      r.pathway({
        id: 'council-prescribed', title: 'Buy through an approved / prescribed arrangement',
        status: 'conditional',
        summary: 'Worth checking before you commit to a full tender.',
        reasons: [
          'If Local Government Procurement, Procurement Australia or a NSW Procurement Board contract covers this category, you may be able to use it without tendering under s 55(3).',
          'You answered that no such arrangement covers the requirement, or you were not sure. Check before running a tender, it is the single biggest time saving available to a council at this value.'
        ],
        basis: ['lga55', 'lgp'], confidence: 'medium'
      });
    }

    /* --- direct negotiation ---------------------------------------------- */
    evaluateCouncilDirect(r, { value: value, threshold: threshold, mustTender: mustTender });

    /* --- obligations ------------------------------------------------------ */
    r.obligation({
      group: 'Approval and record',
      title: 'Value for money and record keeping',
      detail: 'Record the process, the evaluation and the value-for-money conclusion. Councils are audited on this and on compliance with their own adopted procurement policy.',
      basis: ['olg'], confidence: 'medium'
    });
    r.obligation({
      group: 'Disclosure',
      title: 'Register of government contracts',
      detail: 'Councils must enter contracts over ' + money(T.gipaDisclosureInclGst) +
        ' including GST in their contracts register under the GIPA Act, within 45 working days of the contract coming into effect. ' +
        (valueInclGst >= T.gipaClass3InclGst
          ? 'At about ' + money(valueInclGst) + ' incl GST, if this is a class 2 contract it is class 3 and a copy of the contract itself must be published.'
          : 'A class 2 contract of ' + money(T.gipaClass3InclGst) + ' or more incl GST becomes class 3, requiring publication of the contract itself.'),
      basis: ['gipa'], confidence: 'high'
    });
    r.obligation({
      group: 'Supply chain',
      title: 'Modern slavery, reasonable steps and annual reporting',
      detail: 'Since 1 July 2022 councils must take reasonable steps to ensure goods and services procured are not the product of modern slavery. From the 2022/23 financial year each council must publish a statement of those steps in its annual report under s 428(4) of the Local Government Act 1993, along with a statement on any significant issue raised by the Anti-slavery Commissioner. The Guidance on Reasonable Steps has been operative since 1 January 2024.',
      basis: ['modernSlavery', 'reasonableSteps'], confidence: 'high'
    });
    if (valueInclGst >= T.modernSlaveryReportInclGst) {
      r.obligation({
        group: 'Supply chain',
        title: 'Anti-slavery Commissioner contract report',
        detail: 'Since 1 July 2024, where a contract of ' + money(T.modernSlaveryReportInclGst) +
          ' including GST or more arises from a "heightened" modern slavery due diligence procurement process, an online report must be filed with the Office of the Anti-slavery Commissioner within 45 days of the contract entering into force. This contract is over that value threshold.',
        basis: ['reasonableSteps'], confidence: 'high'
      });
    }

    r.flag('info', 'NSW Government policies do not automatically apply',
      'The Aboriginal Procurement Policy, the SME and Regional Procurement Policy and the Procurement Board Directions bind NSW Government agencies, not councils. Many councils adopt equivalent local preference, Aboriginal participation and social procurement provisions in their own policy, apply your council\'s instrument, and make sure any local preference weighting is actually authorised by it.');
  }

  function evaluateCouncilDirect(r, ctx) {
    var a = r.answers;
    /* Belt and braces with the app-layer pruning: the grounds question is
       only shown when the buyer wants direct negotiation, so a stale answer
       carried in from elsewhere must not tilt the verdict. */
    var grounds = a.wantDirect === true ? (a.soleGrounds || []) : [];
    var permitted = [], conditions = [], verdict, summary;
    var basis = ['lga55'];

    if (!ctx.mustTender) {
      verdict = 'permitted';
      summary = 'Below ' + money(ctx.threshold) + ' including GST the Act does not require a tender, so direct negotiation is legally open, subject entirely to your council\'s own procurement policy.';
      permitted.push('Section 55(3)(n)(i): the estimated expenditure, inclusive of GST, is below the prescribed threshold.');
      conditions.push('Your council\'s adopted policy almost certainly requires a number of quotes at this value. That policy binds you even though the Act does not.');
      conditions.push('Value the whole requirement including options and foreseeable repeat spend before concluding you are under the threshold.');
    } else {
      var exemptions = [];
      if (a.arrangement === 'lgp' || a.arrangement === 'wog') {
        exemptions.push('The requirement is covered by a prescribed arrangement (LGP / NSW Procurement Board contract), which s 55(3) exempts from tendering.');
      }
      if (has(grounds, 'emergency')) {
        exemptions.push('Emergency: s 55(3) exempts contracts made in a case of emergency. Scope it to what the emergency actually requires.');
      }
      if (a.councilResolution === true) {
        exemptions.push('Council resolution: s 55(3) allows the council to resolve, because of extenuating circumstances, remoteness of locality, or the unavailability of competitive or reliable tenderers, that a satisfactory result would not be achieved by inviting tenders. The resolution must be made and minuted, and must state the reasons.');
      }
      if (has(grounds, 'no-responses')) {
        exemptions.push('A tender process was already run. Section 55 governs what the council may do after declining all tenders, follow that path rather than treating it as an open field.');
      }

      if (exemptions.length) {
        verdict = 'conditional';
        summary = 'A tender is required at this value unless an exemption applies. You have identified one or more, but each has to be properly made out and documented.';
        permitted = exemptions;
        conditions.push('Record the exemption relied on, and the reasons, in the report to council or the delegate\'s approval.');
        conditions.push('Section 55(3) is a closed list. Convenience, incumbency and time pressure of your own making are not exemptions.');
      } else {
        verdict = 'not-permitted';
        summary = 'At ' + money(ctx.value) + ' ex GST (about ' + money(ctx.value * (r.rules.gst || 1.1)) + ' including GST) s 55(1) requires a tender and you have not identified an exemption under s 55(3). Direct negotiation is not available.';
        conditions.push('If you believe an exemption applies, a prescribed arrangement, an emergency, or grounds for a council resolution, revisit those answers.');
        conditions.push('Contracting above the threshold without a tender or a valid exemption exposes the contract and the decision-maker.');
      }
      if (has(grounds, 'unique-technical') || has(grounds, 'ip') || has(grounds, 'compatibility')) {
        conditions.push('Sole-supplier grounds that work for NSW Government agencies (technical uniqueness, exclusive IP, compatibility) are not standalone exemptions under s 55(3). For a council they only help if they support a formal resolution about the unavailability of competitive tenderers.');
      }
    }

    r.directNegotiation = {
      verdict: verdict, summary: summary, grounds: permitted,
      conditions: conditions, basis: basis, confidence: 'medium'
    };

    r.pathway({
      id: 'direct',
      title: 'Direct negotiation with a single supplier',
      status: verdict === 'permitted' ? 'available' : verdict === 'conditional' ? 'conditional' : 'unavailable',
      summary: summary,
      reasons: permitted.length ? permitted : conditions,
      basis: basis, confidence: 'medium'
    });

    if (a.incumbent === 'options-remaining') {
      r.pathway({
        id: 'extend', title: 'Exercise the existing extension option',
        status: 'available',
        summary: 'Not a new contract, so s 55 is not re-triggered, provided the option was part of the tendered contract.',
        reasons: [
          'An option exercised under a contract that was properly tendered is contract management, not a new procurement.',
          'The option must have existed in the tendered contract and been within the value the council approved. An option bolted on later is a new contract.',
          'Benchmark the price and confirm performance before exercising.'
        ],
        basis: ['lga55'], confidence: 'medium'
      });
    }
  }

  /* =========================================================================
   * SOC / university — outside the PBD framework
   * ====================================================================== */

  function evaluateOwnFramework(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);
    var isSoc = a.buyerType === 'nsw-soc';
    r.band = 'own';

    r.flag('stop', 'Your own framework governs, not the NSW Procurement Policy Framework',
      isSoc
        ? 'State owned corporations are excluded from the definition of "government agency" in s 162 of the Public Works and Procurement Act 1912 unless prescribed by regulation, so Procurement Board Directions and the Procurement Policy Framework do not automatically bind you. Confirm whether your SOC is prescribed, and whether your shareholding Ministers or Statement of Corporate Intent impose procurement conditions. Everything below is good practice benchmarked to the NSW rules, not a legal obligation.'
        : 'NSW universities are established under their own Acts and are not bound by Procurement Board Directions or the NSW Procurement Policy Framework. Your university\'s procurement policy and delegations govern. Everything below is good practice benchmarked to the NSW rules, not a legal obligation.');

    r.pathway({
      id: 'own-policy', title: 'Apply your own procurement policy and delegations',
      status: 'mandatory',
      summary: 'Your board or council approved instrument is the binding rule set.',
      reasons: [
        'Start from your own policy\'s value bands and delegation limits, they, not the whole-of-government thresholds, determine what process you must run.',
        'Check whether your entity has voluntarily adopted whole-of-government arrangements or NSW Procurement Board contracts. Many do, and access is often available.',
        'Where your policy is silent, the NSW Government bands below are a reasonable benchmark to argue from.'
      ],
      basis: isSoc ? ['socAct', 'pwpa'] : ['pwpa'], confidence: 'medium'
    });

    var benchmark;
    if (value < T.agencyAnySupplier) benchmark = 'At this value the NSW Government standard is simply to buy from any supplier at reasonable market rates.';
    else if (value < T.agencySingleQuote) benchmark = 'At this value the NSW Government standard is one written quotation.';
    else if (value < T.agencyThreeQuotes) benchmark = 'At this value the NSW Government standard is three written quotations, or an approved procurement process.';
    else benchmark = 'At this value the NSW Government standard is a competitive open approach to market, or sourcing from a prequalification scheme.';

    r.pathway({
      id: 'benchmark', title: 'Benchmark process for this value',
      status: 'recommended',
      summary: benchmark,
      reasons: [
        benchmark,
        'Whatever you run, document the value-for-money conclusion. That is what an audit will ask for.',
        a.arrangement === 'wog' || a.arrangement === 'scheme'
          ? 'You indicated an existing arrangement covers this, using it is usually the fastest defensible route if your entity has access.'
          : 'If no arrangement covers it, a competitive approach proportionate to value is the defensible default.'
      ],
      basis: ['pbd2021_04', 'accreditation'], confidence: 'judgement'
    });

    /* Direct negotiation */
    var permitted = [], conditions = [];
    if (a.incumbent === 'options-remaining') {
      permitted.push('Exercising an unexercised extension option under the existing contract is contract management, not a new procurement.');
    }
    if ((a.soleGrounds || []).length) {
      permitted.push('You have identified sole-source grounds. Under your own framework these are typically sufficient if documented and approved at the right delegation, but the test is your policy\'s, not PBD-2019-05\'s.');
    }
    conditions.push('Confirm what your own policy requires for single-source engagement, most require a written justification and a higher delegation.');
    conditions.push('Document the value-for-money basis independently of the justification for going direct. They are two different questions.');

    r.directNegotiation = {
      verdict: permitted.length ? 'permitted' : 'conditional',
      summary: permitted.length
        ? 'Direct negotiation is open to you subject to your own policy, no whole-of-government exemption process applies.'
        : 'Direct negotiation is governed entirely by your own policy. There is no external exemption to obtain, but there is an internal one.',
      grounds: permitted, conditions: conditions,
      basis: isSoc ? ['socAct'] : [], confidence: 'low'
    };

    r.pathway({
      id: 'direct', title: 'Direct negotiation with a single supplier',
      status: permitted.length ? 'available' : 'conditional',
      summary: r.directNegotiation.summary,
      reasons: permitted.concat(conditions),
      basis: r.directNegotiation.basis, confidence: 'low'
    });

    /* Obligations that DO still apply */
    r.obligation({
      group: 'Supply chain',
      title: 'Modern slavery due diligence',
      detail: 'The Modern Slavery Act 2018 (NSW) reaches government agencies, local councils and State owned corporations. Take reasonable steps to ensure the goods and services are not the product of modern slavery.',
      basis: ['modernSlavery'], confidence: 'medium'
    });
    r.obligation({
      group: 'Disclosure',
      title: 'Contract disclosure',
      detail: 'If your entity is an agency for GIPA Act purposes, contracts valued at ' + money(T.gipaDisclosureInclGst) + ' or more including GST must be entered in the contracts register within 45 working days.',
      basis: ['gipa'], confidence: 'medium'
    });
    if (isSoc && a.ictProject === true && a.procurementType === 'ict') {
      r.obligation({
        group: 'ICT',
        title: 'ICT Assurance Framework',
        detail: 'The ICT Assurance Framework extends to State Owned Corporations for State-funded ICT projects of ' + money(T.iafIctProject) + ' and above.',
        basis: ['iaf'], confidence: 'medium'
      });
    }
  }

  /* =========================================================================
   * Contracting framework and scheme selection.
   *
   * Two jobs. First: if this is ICT and the MICTA/ICTA framework applies, say
   * which ICTA module(s) to attach — picking the wrong module is a drafting
   * error that surfaces late. Second: identify the prequalification scheme,
   * either the one the user named or the one inferred from the category.
   * ====================================================================== */

  /* The new ICT/business split feeds the internal category the rest of the
     engine reasons about. Direct `category` answers still work. */
  function deriveCategory(rules, a) {
    if (a.procurementType === 'ict') {
      var ic = rules.ictCategories[a.ictCategory];
      return ic ? ic.maps : 'ict-services';
    }
    if (a.procurementType === 'business') {
      var bc = rules.bizCategories[a.bizCategory];
      return bc ? bc.maps : 'general-services';
    }
    return a.category;
  }

  function evaluateContracting(r) {
    var a = r.answers, rules = r.rules, T = rules.thresholds;
    var value = num(a.value);
    var isIct = a.procurementType === 'ict';
    var cat = isIct ? rules.ictCategories[a.ictCategory] : rules.bizCategories[a.bizCategory];
    if (!cat) return;

    var out = {
      categoryLabel: cat.label,
      isIct: isIct,
      framework: null, frameworkWhy: [], modules: [], moduleWhy: cat.moduleWhy || null,
      schemes: [], schemeSource: null, schemeNotes: [],
      basis: [], confidence: 'medium'
    };

    /* --- contracting framework ------------------------------------------ */
    if (isIct) {
      var icta = value > T.ictaHighValue;
      out.framework = icta ? 'MICTA / ICTA' : 'MICTA / ICTA, or a lighter template';
      out.modules = cat.modules || [];
      out.frameworkWhy.push(icta
        ? 'The MICTA/ICTA contracting framework is the set of contract documents used when buying high-risk or high-value ICT goods and services, over ' +
          money(T.ictaHighValue) + '. At ' + money(value) + ' you are above that, so plan on contracting under it.'
        : 'MICTA/ICTA is the framework for high-risk or high-value ICT, over ' + money(T.ictaHighValue) +
          '. At ' + money(value) + ' you are below that on value, so it turns on risk. If this is high risk, use MICTA/ICTA anyway; otherwise a lighter template or the scheme\'s own order documents may be appropriate.');
      out.frameworkWhy.push('MICTA/ICTA replaces Procure IT version 3.2. The MICTA replaces the Head Agreement and can establish a standing offer arrangement; the ICTA is functionally equivalent to the Procure IT Customer Contract.');
      if (cat.note) out.frameworkWhy.push(cat.note);
      out.basis.push('micta', 'schemeIct');
      out.confidence = 'high';
    } else {
      out.framework = 'Core& or the scheme\'s own contract terms';
      out.frameworkWhy.push('Non-ICT goods and services are contracted on the standard NSW templates or on the terms carried by the scheme or panel you buy through. Confirm which applies before you draft.');
      out.frameworkWhy.push('This tool does not have full visibility of every preferred contracting template for business goods and services, so treat the framework line as a pointer and confirm it. The scheme position below is the more reliable half.');
      out.confidence = 'low';
    }

    /* --- schemes ---------------------------------------------------------- */
    if (a.schemeKnown === 'yes' && a.schemeSelected) {
      out.schemeSource = 'named';
      if (a.schemeSelected === 'other') {
        out.schemeNotes.push('You named a scheme this tool does not carry. Check it still covers the category and that its terms suit the requirement, and confirm it is a current arrangement.');
      } else if (rules.schemes[a.schemeSelected]) {
        out.schemes.push(rules.schemes[a.schemeSelected]);
      }
      var expected = cat.schemes || [];
      var namedKey = a.schemeSelected;
      if (expected.length && expected.indexOf(namedKey) === -1 && namedKey !== 'other') {
        out.schemeNotes.push('Worth a second look: for ' + cat.label.toLowerCase() +
          ' the arrangement usually used is ' +
          expected.map(function (k) { return rules.schemes[k] ? rules.schemes[k].code : k; }).join(' or ') +
          ', not the one you selected. That may be deliberate, just confirm the scheme actually covers this category.');
      }
    } else if (a.schemeKnown === 'none') {
      out.schemeSource = 'none-declared';
      var wouldBe = (cat.schemes || []).map(function (k) { return rules.schemes[k]; }).filter(Boolean);
      if (wouldBe.length) {
        out.schemes = wouldBe;
        out.schemeNotes.push('You said no scheme applies, but for ' + cat.label.toLowerCase() +
          ' the arrangements below normally do. Check them before you go to open market, for ICT in particular, using the scheme is mandated rather than optional.');
      } else {
        out.schemeNotes.push('No scheme is associated with this category in the rule pack, which is consistent with your answer. Search the scheme list on buy.nsw before concluding none exists.');
      }
    } else {
      out.schemeSource = 'inferred';
      out.schemes = (cat.schemes || []).map(function (k) { return rules.schemes[k]; }).filter(Boolean);
      if (!out.schemes.length) {
        out.schemeNotes.push('No prequalification scheme is mapped to ' + cat.label.toLowerCase() +
          ' in this rule pack. That does not prove none exists, search the scheme list on buy.nsw, and check whether a whole-of-government contract covers it instead.');
      } else {
        out.schemeNotes.push('Inferred from the category you selected. Confirm the scheme covers your specific requirement before relying on it.');
      }
    }
    if (cat.note && !isIct) out.schemeNotes.push(cat.note);
    if (isIct) {
      out.schemeNotes.push('Use of the ICT Services Scheme is mandated for agency ICT procurement, it is not one option among several.');
    }

    r.contracting = out;
  }

  /* =========================================================================
   * Approach to market: stages, RFX, supporting activities, negotiation.
   *
   * The model, kept deliberately strict:
   *   STAGES     single (one RFX) or multi (EOI, then an RFX)
   *   RFX        RFQ, RFP or RFT
   *   ACTIVITIES industry briefing, product demo, site visit, RFI — these
   *              support the process but are NOT stages
   *   NEGOTIATION a commercial round / BAFO — also NOT a stage
   * ====================================================================== */

  var RFX = {
    rfq: { label: 'RFQ (request for quote)', why: 'You ask suppliers to price a specification you have already defined.' },
    rfp: { label: 'RFP (request for proposal)', why: 'You know the outcome you want but not the best way to deliver it, so you ask suppliers to propose an approach.' },
    rft: { label: 'RFT (request for tender)', why: 'A publicly advertised open tender against a defined requirement.' }
  };

  function evaluateApproach(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);
    var band = r.band;
    var directOk = r.directNegotiation && r.directNegotiation.verdict === 'permitted';
    var bt = r.rules.buyerTypes[a.buyerType] || {};
    /* Covered status only exists inside the Board's framework, and an
       unanswered Schedule 2 question is treated as covered — same conservative
       posture as the direct-negotiation module. */
    var covered = bt.framework === 'ppf' &&
      (a.eppCovered === 'yes' || a.eppCovered === 'unknown') && value >= T.eppGoodsServices;

    /* The bands mean different things per rulebook:
         ppf  micro / low / mid / high      (unaccredited reference bands)
         lga  below-threshold / tender      (s 55, GST-inclusive)
         own  own                           (SOC/university: their framework)
       A council under its threshold getting "run an RFT" because the agency
       bands did not match is exactly the bug this mapping exists to prevent. */
    var councilMustTender = band === 'tender';
    var quoteBand = band === 'micro' || band === 'low' ||
      band === 'below-threshold' ||
      (band === 'own' && value < T.agencyThreeQuotes) ||
      (band === 'mid' && a.marketKnowledge === 'known-few');

    /* --- RFX ---------------------------------------------------------- */
    var rfx, rfxWhy = [];
    if (a.specClarity === 'outcome-known' || a.specClarity === 'exploring') {
      rfx = 'rfp';
      rfxWhy.push('You said the outcome is known but the solution is not. That is the textbook case for an RFP rather than an RFQ or RFT, you are buying an approach, not a priced line item.');
    } else if (quoteBand) {
      rfx = 'rfq';
      rfxWhy.push(band === 'below-threshold'
        ? 'The requirement is fully specified and the value is under the council tendering threshold, so quotations under your own procurement policy are proportionate.'
        : band === 'own'
          ? 'The requirement is fully specified and, by reference to the value bands agencies use as guidance, quotations are proportionate. Your own procurement framework governs the exact process.'
          : 'The requirement is fully specified and the value sits in the quotation bands, so an RFQ to a small number of suppliers is proportionate.');
    } else {
      rfx = 'rft';
      rfxWhy.push(band === 'own'
        ? 'The requirement is fully specified and at this value an advertised competitive process is the defensible recommendation, your own framework sets the binding requirement.'
        : 'The requirement is fully specified and the value warrants an advertised competitive process.');
    }
    if (covered && rfx === 'rfq') {
      rfx = 'rft';
      rfxWhy.push('Overridden to an RFT: this is a covered procurement, so an open approach is required regardless of how well specified the requirement is.');
    }
    if (councilMustTender && rfx !== 'rft') {
      rfx = 'rft';
      rfxWhy.push('Overridden to a tender: at this value s 55 of the Local Government Act requires tendering, open tender, or selective tender following an EOI. An RFQ or a bare RFP is not one of the prescribed methods.');
    }

    /* --- stages ------------------------------------------------------- */
    var multi = false, stageWhy = [];
    if (a.marketKnowledge === 'unknown') {
      multi = true;
      stageWhy.push('You do not yet know who can deliver this. An EOI is the way to establish capability and interest before committing to a full response.');
    }
    if (a.bidCost === 'high' && a.marketKnowledge !== 'known-few') {
      multi = true;
      stageWhy.push('Bidding is expensive for suppliers. Shortlisting through an EOI avoids asking a wide field to do design work most of them will lose.');
    }
    if (a.marketKnowledge === 'known-many' && value >= T.eppGoodsServices && a.bidCost === 'high') {
      multi = true;
      stageWhy.push('A large field at this value produces an evaluation burden that a shortlisting stage materially reduces.');
    }
    if (a.marketKnowledge === 'known-few') {
      multi = false;
      stageWhy = ['You already know the market and there are few capable suppliers. A shortlisting stage would cost time without narrowing anything, go straight to a single-stage process.'];
    }
    if (band === 'micro' || band === 'low' ||
        ((band === 'below-threshold' || band === 'own') && value < T.agencyThreeQuotes)) {
      multi = false;
      stageWhy = ['At ' + money(value) + ' a two-stage process costs more in elapsed time and effort than it can return. Single stage.'];
    }
    if (councilMustTender && multi) {
      stageWhy.push('For a council the two-stage form is selective tendering: a public EOI first, then tenders invited from the shortlist, both stages prescribed by the Regulation.');
    }

    /* --- override ------------------------------------------------------ */
    var override = a.approachOverride || '';
    var recommendedId = (multi ? 'multi-' : 'single-') + rfx;
    var chosen = override || recommendedId;

    r.approach = {
      recommendedId: recommendedId,
      chosenId: chosen,
      overridden: !!override && override !== recommendedId,
      stages: multi ? 'multi' : 'single',
      rfx: rfx,
      rfxLabel: RFX[rfx].label,
      label: multi ? 'Multi stage, EOI, then ' + RFX[rfx].label : 'Single stage, ' + RFX[rfx].label,
      why: stageWhy.concat(rfxWhy),
      notes: [],
      activities: [],
      negotiation: null,
      basis: ['marketApproaches', 'multiStage', 'industryEngagement'],
      confidence: 'judgement'
    };

    if (multi) {
      r.approach.notes.push('An EOI establishes capability and interest only. It does not need price criteria and it does not award a contract, the award happens at the second stage.');
      if (rfx === 'rft') r.approach.notes.push('The second stage is a selective RFT issued to the shortlist, not a fresh open advertisement.');
    }
    if (directOk) {
      r.approach.notes.push('A set-aside or low-value pathway already lets you go direct. Running a competitive process is still open to you, but it is a choice rather than an obligation here.');
    }
    if (covered) {
      r.approach.notes.push('As a covered procurement, whatever you run must satisfy PBD-2019-05, including the minimum tender period for your chosen method and publication of the criteria and their relative importance.');
      r.approach.basis.push('pbd2019_05', 'evalCriteria');
    }

    /* --- override consequences ----------------------------------------- */
    if (r.approach.overridden) {
      var oMulti = /^multi-/.test(override);
      var oRfx = override.replace(/^(multi|single)-/, '');
      if (override === 'limited') {
        r.approach.label = 'Limited tender / direct negotiation (your choice)';
        r.approach.notes.unshift(r.directNegotiation && r.directNegotiation.verdict === 'not-permitted'
          ? 'You selected limited tender, but on your inputs that is not permissible. See the direct negotiation section, proceeding would need grounds you have not identified.'
          : 'You selected limited tender. Check the direct negotiation section for the grounds you must document and who has to approve it.');
      } else {
        r.approach.label = (oMulti ? 'Multi stage, EOI, then ' : 'Single stage, ') + (RFX[oRfx] ? RFX[oRfx].label : oRfx) + ' (your choice)';
        if (covered && oRfx === 'rfq') {
          r.approach.notes.unshift('Your chosen RFQ is a problem: this is a covered procurement and an open approach is required. An RFQ to selected suppliers will not satisfy PBD-2019-05.');
        }
        if (!oMulti && multi) {
          r.approach.notes.unshift('You have dropped the EOI stage that was recommended. That is permissible, just expect a wider, more expensive field to evaluate, and higher bid costs borne by suppliers who cannot win.');
        }
        if (oMulti && !multi) {
          r.approach.notes.unshift('You have added an EOI stage that the inputs do not call for. It is permissible, but it will add elapsed time without narrowing a field you already understand.');
        }
      }
    }

    /* --- supporting activities (not stages) ---------------------------- */
    function activity(name, when, why) {
      r.approach.activities.push({ name: name, recommended: when, why: why });
    }
    activity('Request for information (RFI)',
      a.specClarity === 'exploring',
      a.specClarity === 'exploring'
        ? 'You cannot write the requirement yet. An RFI is the right instrument, but note it is industry engagement that happens BEFORE the approach to market. It is not a stage and it cannot lead to an award.'
        : 'Not needed, you can already describe what you want well enough to go to market.');
    activity('Industry briefing',
      a.marketKnowledge !== 'known-few' && (value >= T.smeParticipation || a.specClarity !== 'defined'),
      a.marketKnowledge !== 'known-few' && (value >= T.smeParticipation || a.specClarity !== 'defined')
        ? 'Worth running. A briefing lifts response quality and reduces the clarification load during the open period. Give every supplier the same information and publish the questions and answers to all of them.'
        : 'Optional. With a defined requirement and a small known field, a briefing adds little.');
    activity('Product demonstration',
      a.category === 'ict-goods' || a.category === 'ict-services',
      (a.category === 'ict-goods' || a.category === 'ict-services')
        ? 'Recommended for ICT, fitness for purpose is hard to judge from a written response. Score it against criteria published up front, not as an impression formed on the day.'
        : 'Not typically warranted for this category.');
    activity('Site visit',
      a.category === 'general-services' || a.category === 'ict-services',
      (a.category === 'general-services' || a.category === 'ict-services')
        ? 'Consider one where delivery depends on a physical location or existing environment. Offer it to all respondents on equal terms.'
        : 'Not typically warranted for this category.');

    /* --- indicative timeline (judgement, not policy) -------------------- */
    var weeks = [];
    if (multi) {
      weeks.push({ step: 'EOI open to market', low: 3, high: 4 });
      weeks.push({ step: 'EOI evaluation and shortlisting', low: 2, high: 3 });
    }
    if (covered) {
      weeks.push({ step: rfx.toUpperCase() + ' open (covered procurement minimum period)', low: 4, high: 6 });
    } else if (rfx === 'rfq') {
      weeks.push({ step: 'RFQ open', low: 1, high: 2 });
    } else {
      weeks.push({ step: rfx.toUpperCase() + ' open', low: 4, high: 5 });
    }
    weeks.push({ step: 'Evaluation and moderation', low: rfx === 'rfq' ? 1 : 3, high: rfx === 'rfq' ? 2 : 6 });
    if (negRecommendedFor(a, value, T)) weeks.push({ step: 'Commercial negotiation / BAFO', low: 2, high: 4 });
    weeks.push({ step: 'Award, contract execution and standstill', low: 2, high: 4 });

    r.approach.timeline = {
      steps: weeks,
      totalLow: weeks.reduce(function (n2, w) { return n2 + w.low; }, 0),
      totalHigh: weeks.reduce(function (n2, w) { return n2 + w.high; }, 0),
      caveats: [
        'These are indicative planning figures, not policy. No NSW source sets them, your own approval cycle, evaluation panel availability and market response will move them.',
        'The long pole is almost always internal approval, not the market. Add your delegate, procurement board and (where required) concurrence lead times on top of the figures above.',
        covered
          ? 'The open period shown reflects the minimum tender period constraints for a covered procurement. Do not compress it without confirming you meet the conditions for a shortened period.'
          : 'Compressing the open period reduces the field and the quality of responses. If you need speed, take it out of your internal steps, not the market\'s.'
      ],
      confidence: 'judgement'
    };

    /* --- commercial negotiation (not a stage) --------------------------- */
    var negRecommended = negRecommendedFor(a, value, T);
    r.approach.negotiation = {
      recommended: negRecommended,
      title: 'Round of commercial negotiation / best and final offers',
      detail: negRecommended
        ? 'Worth building in. Where the solution varies between respondents or the value is significant, a negotiation or BAFO round usually improves commercial terms. It is not a stage, it happens after responses are evaluated, within the same process.'
        : 'Probably unnecessary. With a fully specified requirement at this value, priced responses should be directly comparable and a negotiation round mostly adds elapsed time.',
      cautions: [
        'You must reserve the right in the approach-to-market document. You cannot decide to negotiate after the fact if the terms did not allow for it.',
        'Do not use it to let a preferred respondent re-bid against another\'s price. Run it on equal terms with all shortlisted respondents.',
        covered
          ? 'This is a covered procurement, confirm the negotiation approach is consistent with PBD-2019-05 before you publish.'
          : 'Record what changed between the original response and the final offer, and re-test value for money against the final position.'
      ],
      basis: ['marketApproaches'],
      confidence: 'judgement'
    };
  }

  function negRecommendedFor(a, value, T) {
    return a.specClarity !== 'defined' || value >= T.smeParticipation;
  }

  /* =========================================================================
   * Evaluation criteria arithmetic.
   *
   * The point of this module: the mandated SME and government-objectives
   * allocations are percentages OF THE NON-PRICE CRITERIA, not of the total
   * score. They only equal 10% of the total when non-price is 100%.
   * ====================================================================== */

  function evaluateCriteria(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);
    var price = a.evalPriceWeight;
    if (price === undefined || price === null || price === '') return;
    price = Math.max(0, Math.min(100, num(price)));
    var nonPrice = 100 - price;

    var pct = function (n) { return (Math.round(n * 100) / 100) + '%'; };
    var items = [];
    var applies = value >= T.smeParticipation;

    if (applies) {
      items.push({
        name: 'SME participation',
        ofNonPrice: 10,
        ofTotal: nonPrice * 0.10,
        mandatory: true,
        note: 'Minimum 10% of the non-price criteria.'
      });
      items.push({
        name: 'Government economic, ethical, environmental and social priorities',
        ofNonPrice: 10,
        ofTotal: nonPrice * 0.10,
        mandatory: true,
        note: 'A further minimum 10% of the non-price criteria. CHECK AT SOURCE: the policy text reads as a separate allocation on top of the SME 10%, but 2024 reform commentary describes a combined 15% minimum with the SME 10% inside it. Confirm the current PPF wording before locking weightings.'
      });
    }
    items.push({
      name: 'Aboriginal participation',
      ofNonPrice: null,
      ofTotal: null,
      /* A "should" in the APP, not a "must" — the obligations card and the
         rule pack say so, and this card must not contradict them. */
      mandatory: false,
      note: 'Recommended criterion (an APP "should", not a "must"), with no fixed percentage. If you apply it, you set the weighting and it comes out of the non-price component.'
    });

    var mandatedOfNonPrice = items.reduce(function (s, i) { return s + (i.ofNonPrice || 0); }, 0);
    var mandatedOfTotal = nonPrice * mandatedOfNonPrice / 100;
    var remainingOfTotal = nonPrice - mandatedOfTotal;

    r.evaluation = {
      price: price,
      nonPrice: nonPrice,
      applies: applies,
      items: items,
      mandatedOfNonPrice: mandatedOfNonPrice,
      mandatedOfTotal: mandatedOfTotal,
      remainingOfTotal: remainingOfTotal,
      summary: applies
        ? 'With price at ' + pct(price) + ', your non-price component is ' + pct(nonPrice) + '. The two mandated allocations are ' +
          mandatedOfNonPrice + '% of non-price between them, which is ' + pct(mandatedOfTotal) + ' of the total score, not ' +
          mandatedOfNonPrice + '% of the total. That leaves ' + pct(remainingOfTotal) +
          ' of the total for your own capability, quality and risk criteria, plus whatever you give Aboriginal participation.'
        : 'At ' + money(value) + ' the mandated SME and government-objectives allocations do not apply, they attach to goods and services procurements over ' +
          money(T.smeParticipation) + '. An Aboriginal participation non-price criterion is still recommended under the APP (a \u201cshould\u201d, not a \u201cmust\u201d). Your non-price component is ' + pct(nonPrice) + '.',
      warnings: [],
      basis: applies ? ['sme', 'smeGuidance', 'app', 'evalCriteria'] : ['app', 'evalCriteria'],
      /* The percentages are sourced but the split arithmetic is this tool's,
         and the combined-vs-separate reading of the two 10% minimums is
         contested between the policy text and reform commentary. */
      confidence: applies ? 'medium' : 'medium'
    };

    if (applies && nonPrice > 0 && nonPrice < 30) {
      r.evaluation.warnings.push('Your non-price component is only ' + pct(nonPrice) + '. The two mandated allocations consume ' +
        pct(mandatedOfTotal) + ' of the total, leaving just ' + pct(remainingOfTotal) +
        ' to assess capability, quality and risk. That is very tight, consider whether a price weighting of ' + pct(price) + ' is defensible for this requirement.');
    }
    if (nonPrice === 0) {
      r.evaluation.warnings.push(applies
        ? 'You have set price at 100%, leaving no non-price component at all. That cannot work at this value: at ' + money(T.smeParticipation) + ' and above the SME and government-priorities allocations are mandatory, and they are shares of the non-price component.'
        : 'You have set price at 100%, leaving no non-price component at all. The APP recommends an Aboriginal participation non-price criterion, and a price-only evaluation leaves no room for capability, quality or risk. Confirm this is defensible for the requirement.');
    }
    if (price === 0) {
      r.evaluation.warnings.push('Price is weighted at 0%. Confirm that is deliberate, value for money still has to be demonstrated, and a price-blind evaluation is difficult to defend.');
    }
    if (a.approachOverride && /^multi-/.test(a.approachOverride) || r.approach && r.approach.stages === 'multi') {
      r.evaluation.warnings.push('You are running a two-stage process. This split applies at the RFX stage, an EOI does not need price criteria and does not award anything, so do not carry these weightings into the EOI.');
    }
  }

  /* =========================================================================
   * Evaluation plan.
   *
   * Runs last, once the buyer, value, pathway and stage strategy are settled —
   * it is a drafting aid for the plan, not an input to the recommendation.
   *
   * Two things are held apart throughout:
   *   - the mandated minimums, which come from policy and are cited; and
   *   - the suggested split and pass marks, which are this tool's judgement.
   * Never let the second borrow the authority of the first.
   * ====================================================================== */

  function recommendPriceWeight(a, r, T) {
    var value = num(a.value);
    var why = [], base;

    if (a.specClarity === 'defined') { base = 50; why.push('The requirement is fully specified, so responses are directly comparable and price can carry real weight.'); }
    else if (a.specClarity === 'outcome-known') { base = 30; why.push('You know the outcome but not the solution, so how a supplier proposes to deliver matters more than the headline price.'); }
    else { base = 20; why.push('You are still establishing what is possible, so capability and approach should dominate, a low price against a poorly understood requirement is a risk, not a saving.'); }

    var cat = a.category;
    if (cat === 'general-goods' || cat === 'ict-goods') { base += 10; why.push('Goods are more commoditised than services, which supports a higher price weighting.'); }
    if (cat === 'professional-services') { base -= 10; why.push('For professional services the people and the method are the product; weighting price too heavily selects on rate card rather than outcome.'); }
    if (cat === 'ict-services') { base -= 5; why.push('ICT services carry delivery and integration risk that price alone does not capture.'); }
    if (a.dataSensitivity === 'personal' || a.dataSensitivity === 'protected') {
      base -= 5; why.push('You are handling ' + (a.dataSensitivity === 'protected' ? 'PROTECTED' : 'personal or health') + ' information, so security capability needs enough non-price room to be assessed properly.');
    }
    if (value >= T.smeParticipation) {
      why.push('Above ' + money(T.smeParticipation) + ' two mandated allocations sit inside your non-price component, so it needs to be big enough to carry them and still assess capability.');
    }
    base = Math.max(10, Math.min(70, base));
    return { suggested: base, min: Math.max(10, base - 10), max: Math.min(80, base + 10), why: why };
  }

  function evaluatePlan(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);
    if (!r.evaluation) return;                 /* needs the price weighting */

    var nonPrice = r.evaluation.nonPrice;
    var multi = r.approach && r.approach.stages === 'multi';
    var rec = recommendPriceWeight(a, r, T);
    var userPrice = r.evaluation.price;
    var drift = userPrice - rec.suggested;

    var plan = {
      recommendedPrice: rec,
      userPrice: userPrice,
      alignment: Math.abs(drift) <= 10 ? 'aligned' : (drift > 0 ? 'higher' : 'lower'),
      alignmentNote: Math.abs(drift) <= 10
        ? 'Your ' + userPrice + '% price weighting sits within the range this profile suggests (' + rec.min + ' to ' + rec.max + '%).'
        : (drift > 0
            ? 'Your ' + userPrice + '% price weighting is above the ' + rec.min + ' to ' + rec.max + '% this profile suggests. That is your call, but be ready to explain why price should outweigh capability here, and check the mandated allocations still leave room to assess quality.'
            : 'Your ' + userPrice + '% price weighting is below the ' + rec.min + ' to ' + rec.max + '% this profile suggests. Weighting price this lightly makes value for money harder to demonstrate to a delegate or an auditor.'),
      stages: multi ? 'multi' : 'single',
      eoi: null, rfx: null
    };

    /* --- stage 1: EOI (only where the approach is two stage) ------------ */
    if (multi) {
      var shortlist = a.marketKnowledge === 'known-few' ? { min: 3, max: 4 }
        : a.marketKnowledge === 'known-many' ? { min: 5, max: 6 } : { min: 4, max: 6 };
      plan.eoi = {
        purpose: 'The EOI establishes whether suppliers are capable of the work and interested in it. It does not award anything, and it does not need price criteria.',
        priceRule: 'No price criteria at this stage. Asking for price before the requirement is settled produces numbers you cannot compare and cannot rely on.',
        gateway: [
          { name: 'Conforming response', test: 'Submitted on time, in the required format, addressing every mandatory item.',
            expects: 'Respond to every mandatory item using the response schedules provided, and lodge before the closing time. A late or incomplete response is set aside without assessment.' },
          { name: 'Prequalification / scheme membership', test: r.contracting && r.contracting.schemes.length
              ? 'Current membership of ' + r.contracting.schemes.map(function (x) { return x.code; }).join(' or ') + '.'
              : 'Membership of the applicable scheme or panel, where one applies.',
            expects: 'Provide your current scheme registration details and confirm the categories you are prequalified in cover this requirement.' },
          { name: 'Insurances', test: 'Evidence of the required currencies and limits, or an undertaking to obtain them before contract.',
            expects: 'Attach certificates of currency showing the required cover and limits, or an undertaking from your insurer or broker that cover will be in place before contract execution.' },
          { name: 'Conflict of interest', test: 'Declared, and none that cannot be managed.',
            expects: 'Declare any actual, potential or perceived conflict, including prior work for us on this requirement, and set out how you would manage it. A declared and managed conflict is not disqualifying; an undeclared one is.' },
          { name: 'Financial viability', test: 'Able to carry a contract of this size for its term.',
            expects: 'Provide the financial information requested so we can confirm you can carry a contract of this size for its full term. Consent to a financial assessment where one is sought.' }
        ],
        criteria: [
          { name: 'Relevant experience and track record', pct: 35,
            why: 'The strongest predictor at shortlisting stage, what they have actually delivered, for whom, at what scale.',
            expects: 'Demonstrate comparable work delivered in the last three to five years: what the engagement was, its scale and value, your role in it, the outcome achieved, and a contactable referee. Comparable means similar in complexity and setting, not merely similar in name.' },
          { name: 'Technical capability', pct: 30,
            why: 'Whether the capability genuinely exists in-house rather than being assembled if they win.',
            expects: 'Show the capability already exists in your organisation, accreditations, methods, tooling and depth of expertise. If any part would be subcontracted or recruited on award, say so plainly and identify who would provide it.' },
          { name: 'Capacity and resourcing', pct: 20,
            why: 'Free capacity over your delivery window, not capability in the abstract.',
            expects: 'Show you have uncommitted capacity across the delivery window: indicative team size and mix, current commitments that overlap it, and how you would absorb this work without displacing it.' },
          { name: 'Understanding of the requirement', pct: 15,
            why: 'Kept light at this stage, you are testing comprehension, not asking for a solution they are not being paid to design.',
            expects: 'Set out, briefly, your understanding of the problem and the two or three risks you consider most material. A full solution is not sought at this stage and will not be scored.' }
        ],
        passMark: 60,
        passRule: 'Score each criterion, apply the weightings, and shortlist respondents scoring 60% or more, then take the top ' + shortlist.min + ', ' + shortlist.max + ' of those.',
        shortlist: shortlist,
        notes: [
          'Publish the pass mark and the shortlist size in the EOI document. Deciding either after you see the responses is a probity problem.',
          'A gateway criterion is pass/fail and is not scored. Do not let a strong score elsewhere rescue a failed gateway.',
          'If fewer respondents pass than your minimum shortlist, do not lower the bar retrospectively, record why the field was thin and proceed with those who passed.'
        ]
      };
    }

    /* --- stage 2 (or only stage): the RFX -------------------------------- */
    var gate = [
      { name: 'Conforming response', test: 'On time, in format, all mandatory items addressed.', basis: [],
        expects: 'Use the response schedules provided, address every mandatory item, and lodge before the closing time. State any departure from the draft contract terms explicitly, a departure raised after award will not be entertained.' },
      { name: 'Supplier Code of Conduct', test: 'Accepted, and flowed down to their own supply chain.', basis: ['supplierCode'],
        expects: 'Confirm you accept the NSW Government Supplier Code of Conduct and that you will flow its requirements down to your own subcontractors and suppliers.' },
      { name: 'Modern slavery due diligence', test: 'Response demonstrating reasonable steps across the supply chain.', basis: ['modernSlavery', 'reasonableSteps'],
        expects: 'Describe the reasonable steps you take to identify and address modern slavery risk in your operations and supply chain, how you map your suppliers, what you do when risk is found, and how you remediate. Scale the answer to the risk in this category.' },
      { name: 'Insurance and WHS', test: 'Required currencies, limits and safety systems evidenced.', basis: [],
        expects: 'Provide certificates of currency for each required policy at the stated limits, and evidence of your work health and safety management system and recent safety performance.' }
    ];
    if (a.procurementType === 'ict' && a.dataSensitivity && a.dataSensitivity !== 'none') {
      gate.push({ name: 'Security and data handling', test: 'Controls matched to the ' +
        (a.dataSensitivity === 'personal' ? 'personal or health information' : a.dataSensitivity.toUpperCase()) +
        ' classification, and a supplier risk assessment covering access, storage and maintenance.', basis: ['cyber'],
        expects: 'Set out where data will be stored and processed, who can access it and under what controls, your certifications, your breach notification process, and what happens to the data at the end of the contract. Confirm whether any access or storage occurs offshore.' });
    }
    if (value >= T.smeParticipation) {
      gate.push({ name: 'SME and Local Participation Plan', test: 'Submitted. It becomes contractually binding and is reported against quarterly.', basis: ['sme', 'smeGuidance'],
        expects: 'Submit a plan setting out the SME and NSW-based content you will use: which subcontractors, what proportion of contract value, and how you will report it each quarter. Commit only to what you can deliver, the plan becomes contractually binding.' });
    }
    if (value >= T.appParticipation) {
      gate.push({ name: 'Aboriginal Participation Plan', test: 'Submitted, showing how the minimum ' + T.appParticipationPct + '% requirement will be met. The successful supplier must implement it.', basis: ['app'],
        expects: 'Submit a plan showing how you will meet the minimum ' + T.appParticipationPct + '% requirement, using any one or a combination of: subcontracting ' + T.appParticipationPct + '% of contract value to Aboriginal businesses; ' + T.appParticipationPct + '% of the Australian-based workforce directly contributing to the contract being Aboriginal employees; or ' + T.appParticipationPct + '% of contract value spent on education, training or capability-building. Name the businesses or roles where you can.' });
    }

    var mandated = [], recommended = [], discretionary = [];
    if (value >= T.smeParticipation) {
      mandated.push({ name: 'SME participation', pctOfNonPrice: 10, mandatory: true,
        why: 'Minimum 10% of the non-price criteria. Mandated.', basis: ['sme', 'smeGuidance'], confidence: 'high',
        expects: 'Show how this contract will create genuine opportunity for small and medium enterprises: named SME subcontractors where possible, the share of contract value flowing to them, and how you will support them to perform. Generic statements of intent score poorly.' });
      mandated.push({ name: 'Government economic, ethical, environmental and social priorities', pctOfNonPrice: 10, mandatory: true,
        why: 'A further, separate minimum 10% of the non-price criteria. Mandated, and it does not overlap the SME allocation.', basis: ['sme', 'smeGuidance'], confidence: 'high',
        expects: 'Show how delivery supports the government\'s economic, ethical, environmental and social objectives, local content, ethical labour and supply chain practices, emissions and waste reduction, and social outcomes. Answer with measurable commitments specific to this contract, not corporate policy statements.' });
    }
    if (value >= T.appParticipation) {
      mandated.push({ name: 'Aboriginal participation', pctOfNonPrice: 10, mandatory: true,
        why: 'Above ' + money(T.appParticipation) + ' a minimum ' + T.appParticipationPct +
          '% Aboriginal participation requirement is mandatory and tenderers must submit an Aboriginal Participation Plan, so the response needs a criterion to be assessed against. The 10% weighting is this tool\'s suggestion, the policy fixes no percentage.',
        basis: ['app'], confidence: 'high', pctIsSuggested: true,
        expects: 'Set out how you will meet the minimum ' + T.appParticipationPct + '% requirement and what you have actually delivered before. Name Aboriginal businesses you would engage, roles you would fill, or the training you would fund. Past performance against previous Aboriginal participation commitments will be considered.' });
    } else {
      recommended.push({ name: 'Aboriginal participation', pctOfNonPrice: 10, mandatory: false, recommended: true,
        why: 'The policy says agencies SHOULD apply this criterion, recommended, not mandatory, at this value. The 10% weighting is this tool\'s suggestion; the policy fixes no percentage.',
        basis: ['app'], confidence: 'high', pctIsSuggested: true,
        expects: 'Describe how this contract would create opportunity for Aboriginal businesses or employment, subcontracting, employment, or training and capability-building. Past performance against previous Aboriginal participation commitments will be considered.' });
    }

    var used = mandated.concat(recommended).reduce(function (n2, m) { return n2 + m.pctOfNonPrice; }, 0);
    var remaining = 100 - used;
    var solutionLed = a.specClarity !== 'defined';
    var EXPECTS = {
      'Proposed solution and methodology': 'Set out the solution you propose and why it fits this problem, the method and stages you would follow, what you need from us and when, and how you would prove it works. Where you have made assumptions, state them.',
      'Proposed approach and methodology': 'Set out how you would deliver against the stated specification: your method, sequence, quality controls and acceptance approach, and what you need from us and when.',
      'Capability and relevant experience': 'Demonstrate comparable delivery: what you did, at what scale, in what setting, the outcome, and a contactable referee. Where the work was done by a team that has since changed, say so.',
      'Key personnel and resourcing': 'Name the individuals who will actually do the work, with their role, time commitment and relevant experience. Confirm their availability across the delivery window and how you would handle replacement if they became unavailable.',
      'Risk and delivery assurance': 'Identify the risks most likely to affect delivery, how you would mitigate each, and how you would govern and report progress. Include how you have recovered a comparable engagement that went off track.'
    };
    var shape = solutionLed
      ? [['Proposed solution and methodology', 0.43], ['Capability and relevant experience', 0.29],
         ['Key personnel and resourcing', 0.17], ['Risk and delivery assurance', 0.11]]
      : [['Capability and relevant experience', 0.43], ['Proposed approach and methodology', 0.21],
         ['Key personnel and resourcing', 0.21], ['Risk and delivery assurance', 0.15]];
    var acc = 0;
    shape.forEach(function (row, i) {
      var pct = i === shape.length - 1 ? remaining - acc : Math.round(remaining * row[1]);
      acc += pct;
      discretionary.push({ name: row[0], pctOfNonPrice: pct, mandatory: false,
        why: solutionLed && i === 0
          ? 'Weighted highest because you are buying an approach, not a specification.'
          : (!solutionLed && i === 0 ? 'Weighted highest because with a settled specification, proven delivery is the main differentiator.' : ''),
        expects: EXPECTS[row[0]] || '',
        basis: [], confidence: 'judgement' });
    });

    var all = mandated.concat(recommended, discretionary).map(function (c) {
      c.pctOfTotal = Math.round(nonPrice * c.pctOfNonPrice) / 100;
      return c;
    });

    plan.rfx = {
      gateway: gate,
      price: { pct: userPrice },
      nonPriceTotal: nonPrice,
      criteria: all,
      mandatedOfNonPrice: used,
      passMark: 50,
      passRule: 'Suggested: a respondent must reach 50% of the available non-price score to be considered value for money, regardless of price. Publish the threshold in the RFX, applying one you did not disclose is a probity failure.',
      notes: [
        'The percentages against the mandated criteria are minimums. You may weight them higher; you may not go below them.',
        'Every percentage in the non-price column is a share of the non-price component. Multiply by ' + nonPrice + '% to get its share of the total score, the "of total" column already does that for you.',
        'State the relative importance of the criteria in the approach-to-market document.' +
          ((r.rules.buyerTypes[a.buyerType] || {}).framework === 'ppf' &&
           (a.eppCovered === 'yes' || a.eppCovered === 'unknown') && value >= T.eppGoodsServices
            ? ' For a covered procurement this is required, not optional.' : ''),
        'Do not add a criterion after responses close, and do not re-weight once you have seen them.'
      ],
      basis: ['evalCriteria']
    };

    if (nonPrice < 40 && value >= T.smeParticipation) {
      plan.warning = 'With non-price at only ' + nonPrice + '%, the three mandated criteria consume ' +
        (Math.round(nonPrice * used) / 100) + '% of the total score and leave ' +
        (Math.round(nonPrice * remaining) / 100) + '% for capability, methodology, personnel and risk combined. That is unlikely to discriminate between respondents. Consider raising the non-price weighting.';
    }

    r.evalPlan = plan;
  }

  /* =========================================================================
   * Cross-cutting checks
   * ====================================================================== */

  function commonChecks(r) {
    var a = r.answers, T = r.rules.thresholds;
    var value = num(a.value);

    if (a.valueIncludesOptions === false) {
      r.flag('warn', 'Contract value may be understated',
        'You indicated the value excludes extension options or expected variations. Thresholds apply to the whole-of-contract value including every option. Re-run this with the full figure, the answer may change.');
    }
    if (a.relatedSpend === 'yes-over') {
      r.flag('stop', 'Aggregation risk',
        'You indicated related spend in the last 12 months would push the combined value over a threshold. Related requirements are aggregated for threshold purposes. Value them together and apply the threshold to the aggregate, or you are contract splitting.');
    } else if (a.relatedSpend === 'unknown') {
      r.flag('warn', 'Check related spend before you commit',
        'Repeat purchases from the same market are aggregated for threshold purposes. Pull the last 12 months of spend in this category before you settle on a method.');
    }
    if (value > 0 && value < 1000) {
      r.flag('info', 'Very low value',
        'At this value the process cost may exceed the spend. Use a purchasing card or standing arrangement if your policy allows.');
    }
    if (a.incumbent === 'no-options' && a.wantDirect === true) {
      r.flag('warn', 'No extension options left',
        'With no options remaining, continuing with the incumbent is a new procurement and has to stand on its own grounds, the existing relationship is not one of them. Plan the replacement process now rather than at expiry.');
    }
  }

  /* =========================================================================
   * Headline selection
   * ====================================================================== */

  function chooseHeadline(r) {
    var order = { mandatory: 0, recommended: 1, available: 2, conditional: 3, unavailable: 4 };
    var candidates = r.pathways.filter(function (p) { return p.id !== 'direct'; });

    /* A set-aside direct engagement outranks a mandated arrangement where the
       policy expressly says so, and only where the user has actually named a
       qualifying supplier. */
    var dn = r.directNegotiation;
    var setAsideDirect = dn && dn.verdict === 'permitted' &&
      (dn.grounds || []).some(function (g) {
        return /Aboriginal Procurement Policy|SME and Regional|Australian Disability Enterprise/.test(g);
      });

    if (setAsideDirect && r.answers.wantDirect === true) {
      r.headline = {
        title: 'Direct engagement under a set-aside pathway',
        statement: dn.summary,
        pathwayId: 'direct',
        confidence: dn.confidence
      };
      return;
    }

    candidates.sort(function (x, y) { return order[x.status] - order[y.status]; });
    var top = candidates[0];
    if (!top) {
      r.headline = { title: 'No pathway determined', statement: 'Check your inputs.', pathwayId: null, confidence: 'low' };
      return;
    }
    r.headline = {
      title: top.title,
      statement: top.summary,
      pathwayId: top.id,
      confidence: top.confidence,
      status: top.status
    };
  }

  /* =========================================================================
   * Public entry point
   * ====================================================================== */

  function evaluate(rules, answers) {
    /* Work on a shallow copy so the derived category never leaks back into the
       caller's object, and the same answers can be re-evaluated safely. */
    var a = {};
    for (var k in answers) if (Object.prototype.hasOwnProperty.call(answers, k)) a[k] = answers[k];
    a.category = deriveCategory(rules, a);

    var r = new Result(rules, a);
    var bt = rules.buyerTypes[a.buyerType];

    if (!bt) {
      r.flag('stop', 'No buyer type selected', 'Select who the buyer is, nothing else can be determined without it.');
      return r;
    }

    /* A missing, zero, negative or non-finite value cannot be banded — every
       threshold comparison downstream would silently read it as $0 and hand
       back "buy from any supplier" with a straight face. */
    var rawValue = Number(a.value);
    if (a.value === undefined || a.value === null || a.value === '' ||
        !isFinite(rawValue) || rawValue <= 0) {
      r.flag('stop', 'No usable contract value',
        'Enter the estimated contract value (ex GST, whole dollars, greater than zero) before relying on anything here. Every threshold this tool applies is a comparison against that figure, without it the rest of this output would be a guess dressed as an answer.');
    }

    if (bt.framework === 'ppf') evaluateAgency(r);
    else if (bt.framework === 'lga') evaluateCouncil(r);
    else evaluateOwnFramework(r);

    commonChecks(r);
    chooseHeadline(r);
    /* Both depend on the band and the direct-negotiation verdict, so they run
       after the buyer-type branch has settled those. */
    evaluateContracting(r);
    evaluateApproach(r);
    evaluateCriteria(r);
    /* Last: a drafting aid built on everything already settled above. */
    evaluatePlan(r);

    r.pathways.sort(function (x, y) { return x.rank - y.rank; });
    r.meta = {
      jurisdiction: rules.label,
      version: rules.version,
      asAt: rules.asAt,
      buyerType: bt.label,
      value: num(answers.value)
    };
    return r;
  }

  API = { evaluate: evaluate, money: money, STATUS: STATUS };
})();

export const evaluate = (rules, answers) => API.evaluate(rules, answers);
export const money = (n) => API.money(n);
export const STATUS = () => API.STATUS;

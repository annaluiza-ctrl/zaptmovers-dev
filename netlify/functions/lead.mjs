const SMARTMOVING_URL =
  "https://api.smartmoving.com/api/leads/from-provider/v2"

const ALLOWED_ORIGINS = new Set([
  "https://youthful-success-648235.framer.app",
  "https://www.zaptmovers.com",
  "https://zaptmovers.com",
  "https://zaptmovers.netlify.app",
])

// Preencher depois com os IDs reais do SmartMoving.
const BRANCH_IDS = {
  bay: "",
  la: "",
  dfw: "",
}

function getCorsHeaders(req) {
  const origin = req.headers.get("origin")

  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  }

  if (!origin) {
    return headers
  }

  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }

  return headers
}

function jsonResponse(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(req),
    },
  })
}

function clean(value) {
  if (value === undefined || value === null) {
    return ""
  }

  return String(value).trim()
}

function firstValue(...values) {
  for (const value of values) {
    const result = clean(value)

    if (result !== "") {
      return result
    }
  }

  return ""
}

function formatMoveDate(value) {
  const raw = clean(value)

  if (!raw) {
    return ""
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return raw
  }

  // YYYY-MM-DD
  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  )

  if (isoMatch) {
    return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`
  }

  // MM/DD/YYYY
  const usMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  )

  if (usMatch) {
    const month = usMatch[1].padStart(2, "0")
    const day = usMatch[2].padStart(2, "0")
    const year = usMatch[3]

    return `${year}${month}${day}`
  }

  return raw
}

function isUSZip(value) {
  return /^\d{5}(-\d{4})?$/.test(clean(value))
}

function extractZip(value) {
  const text = clean(value)

  const match = text.match(
    /\b(\d{5})(?:-\d{4})?\b/
  )

  if (!match) {
    return null
  }

  return Number(match[1])
}

function detectBranch(origin) {
  const text = clean(origin).toLowerCase()
  const zip = extractZip(origin)

  /*
   * DALLAS / FORT WORTH
   *
   * Exemplos:
   * Dallas 75201
   * Plano 75024
   * Fort Worth 76102
   * Frisco 75034
   */
  if (
    zip &&
    (
      (zip >= 75000 && zip <= 75399) ||
      (zip >= 76000 && zip <= 76299)
    )
  ) {
    return "dfw"
  }

  if (
    text.includes("dallas") ||
    text.includes("fort worth") ||
    text.includes("plano") ||
    text.includes("frisco") ||
    text.includes("irving") ||
    text.includes("arlington") ||
    text.includes("garland") ||
    text.includes("richardson") ||
    text.includes("mckinney") ||
    text.includes("carrollton") ||
    text.includes("grand prairie")
  ) {
    return "dfw"
  }

  /*
   * LOS ANGELES / ORANGE COUNTY
   */
  if (
    zip &&
    (
      (zip >= 90000 && zip <= 91899) ||
      (zip >= 92600 && zip <= 92899)
    )
  ) {
    return "la"
  }

  if (
    text.includes("los angeles") ||
    text.includes("anaheim") ||
    text.includes("irvine") ||
    text.includes("orange county") ||
    text.includes("santa ana") ||
    text.includes("newport beach") ||
    text.includes("huntington beach") ||
    text.includes("long beach") ||
    text.includes("pasadena") ||
    text.includes("glendale") ||
    text.includes("burbank") ||
    text.includes("hollywood")
  ) {
    return "la"
  }

  /*
   * BAY AREA
   */
  if (
    zip &&
    zip >= 94000 &&
    zip <= 95199
  ) {
    return "bay"
  }

  if (
    text.includes("san francisco") ||
    text.includes("san jose") ||
    text.includes("oakland") ||
    text.includes("hayward") ||
    text.includes("santa clara") ||
    text.includes("fremont") ||
    text.includes("berkeley") ||
    text.includes("palo alto") ||
    text.includes("sunnyvale") ||
    text.includes("mountain view") ||
    text.includes("san mateo") ||
    text.includes("redwood city") ||
    text.includes("walnut creek")
  ) {
    return "bay"
  }

  return ""
}

function toBooleanString(value) {
  if (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === 1 ||
    value === "yes" ||
    value === "on"
  ) {
    return "true"
  }

  return "false"
}

export default async (req) => {
  const originHeader = req.headers.get("origin")

  if (
    originHeader &&
    !ALLOWED_ORIGINS.has(originHeader)
  ) {
    console.error(
      "Origin not allowed:",
      originHeader
    )

    return jsonResponse(
      req,
      {
        error: "Origin not allowed",
      },
      403
    )
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          Allow: "POST, OPTIONS",
          ...getCorsHeaders(req),
        },
      }
    )
  }

  const key =
    process.env.SMARTMOVING_PROVIDER_KEY

  if (!key) {
    console.error(
      "SMARTMOVING_PROVIDER_KEY environment variable is not set"
    )

    return jsonResponse(
      req,
      {
        error:
          "SMARTMOVING_PROVIDER_KEY is not set in Netlify environment variables",
      },
      500
    )
  }

  let input

  try {
    input = await req.json()
  } catch (err) {
    console.error(
      "Invalid JSON:",
      err
    )

    return jsonResponse(
      req,
      {
        error: "Invalid JSON",
      },
      400
    )
  }

  // Honeypot
  if (input.company) {
    return jsonResponse(
      req,
      {
        ok: true,
      },
      200
    )
  }

  const fullName = firstValue(
    input.fullName,
    input.name,
    input.customerName,
    input.full_name
  )

  const firstName = firstValue(
    input.firstName,
    input.first_name
  )

  const lastName = firstValue(
    input.lastName,
    input.last_name
  )

  if (!fullName && !firstName) {
    console.error(
      "Missing name:",
      JSON.stringify(input)
    )

    return jsonResponse(
      req,
      {
        error: "Missing name",
      },
      400
    )
  }

  const phoneNumber = firstValue(
    input.phoneNumber,
    input.phone,
    input.phone_number
  )

  const email = firstValue(
    input.email,
    input.emailAddress
  )

  const moveDate = formatMoveDate(
    firstValue(
      input.moveDate,
      input.preferredDate,
      input.date,
      input.move_date
    )
  )

  const movingFrom = firstValue(
    input.originZip,
    input.movingFrom,
    input.from,
    input.origin,
    input.pickupZip
  )

  const movingTo = firstValue(
    input.destinationZip,
    input.movingTo,
    input.to,
    input.destination,
    input.deliveryZip
  )

  const moveSize = firstValue(
    input.moveSize,
    input.bedrooms,
    input.move_size,
    input.size
  )

  const referralSource = firstValue(
    input.referralSource,
    input.hearAboutUs,
    input.howDidYouHearAboutUs,
    input.source
  )

  const userOptIn = toBooleanString(
    input.userOptIn ??
      input.smsConsent ??
      input.consent ??
      input.marketingConsent ??
      false
  )

  /*
   * Detecta automaticamente a filial
   * usando Moving From.
   */
  const detectedBranch =
    detectBranch(movingFrom)

  /*
   * Se não conseguir detectar,
   * usa o branch enviado pelo formulário.
   */
  const branchKey =
    detectedBranch ||
    firstValue(input.branch)

  const branchId =
    BRANCH_IDS[branchKey]

  const smartMovingLead = {}

  if (fullName) {
    smartMovingLead.fullName =
      fullName
  } else {
    smartMovingLead.firstName =
      firstName

    if (lastName) {
      smartMovingLead.lastName =
        lastName
    }
  }

  if (phoneNumber) {
    smartMovingLead.phoneNumber =
      phoneNumber
  }

  if (email) {
    smartMovingLead.email =
      email
  }

  if (moveDate) {
    smartMovingLead.moveDate =
      moveDate
  }

  if (moveSize) {
    smartMovingLead.moveSize =
      moveSize
  }

  if (referralSource) {
    smartMovingLead.referralSource =
      referralSource
  }

  if (phoneNumber) {
    smartMovingLead.userOptIn =
      userOptIn
  }

  /*
   * Se o usuário digitar somente ZIP,
   * envia como ZIP.
   *
   * Se digitar cidade/endereço + ZIP,
   * envia o endereço completo.
   */
  if (movingFrom) {
    if (isUSZip(movingFrom)) {
      smartMovingLead.originZip =
        movingFrom
    } else {
      smartMovingLead.originAddressFull =
        movingFrom
    }
  }

  if (movingTo) {
    if (isUSZip(movingTo)) {
      smartMovingLead.destinationZip =
        movingTo
    } else {
      smartMovingLead.destinationAddressFull =
        movingTo
    }
  }

  let url =
    `${SMARTMOVING_URL}?providerKey=${encodeURIComponent(
      key
    )}`

  if (branchId) {
    url +=
      `&branchId=${encodeURIComponent(
        branchId
      )}`
  }

  console.log(
    "Original form payload:",
    JSON.stringify(input)
  )

  console.log(
    "Moving From:",
    movingFrom
  )

  console.log(
    "Branch sent by form:",
    input.branch || "not provided"
  )

  console.log(
    "Branch automatically detected:",
    detectedBranch || "not detected"
  )

  console.log(
    "Final Branch:",
    branchKey || "not configured"
  )

  console.log(
    "Branch ID:",
    branchId || "not configured"
  )

  console.log(
    "SmartMoving payload:",
    JSON.stringify(smartMovingLead)
  )

  try {
    const smResponse =
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          smartMovingLead
        ),
      })

    const responseText =
      await smResponse.text()

    console.log(
      "SmartMoving HTTP status:",
      smResponse.status
    )

    console.log(
      "SmartMoving response:",
      responseText ||
        "(empty response)"
    )

    if (!smResponse.ok) {
      console.error(
        "SmartMoving rejected lead:",
        smResponse.status,
        responseText,
        JSON.stringify(
          smartMovingLead
        )
      )

      return jsonResponse(
        req,
        {
          ok: false,
          error:
            "SmartMoving rejected lead",
          smartMovingStatus:
            smResponse.status,
          smartMovingResponse:
            responseText,
        },
        smResponse.status
      )
    }

    console.log(
      "Lead submitted successfully to SmartMoving:",
      fullName ||
        `${firstName} ${lastName}`,
      phoneNumber
    )

    return jsonResponse(
      req,
      {
        ok: true,
        branch:
          branchKey || null,
        smartMovingStatus:
          smResponse.status,
        smartMovingResponse:
          responseText || null,
      },
      200
    )
  } catch (err) {
    console.error(
      "Could not reach SmartMoving:",
      err,
      JSON.stringify(
        smartMovingLead
      )
    )

    return jsonResponse(
      req,
      {
        ok: false,
        error:
          "Upstream unavailable",
      },
      502
    )
  }
}

export const config = {
  path: "/api/lead",
}

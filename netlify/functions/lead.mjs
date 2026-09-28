const SMARTMOVING_URL =
  "https://api.smartmoving.com/api/leads/from-provider/v2"

const ALLOWED_ORIGINS = new Set([
  "https://youthful-success-648235.framer.app",
  "https://www.zaptmovers.com",
  "https://zaptmovers.com",
  "https://zaptmovers.netlify.app",
])

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

  // Já está em YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return raw
  }

  // YYYY-MM-DD
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (match) {
    return `${match[1]}${match[2]}${match[3]}`
  }

  // MM/DD/YYYY
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (match) {
    const month = match[1].padStart(2, "0")
    const day = match[2].padStart(2, "0")
    const year = match[3]

    return `${year}${month}${day}`
  }

  // DD/MM/YYYY
  // Só entra aqui quando o primeiro número claramente não pode ser mês.
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (match && Number(match[1]) > 12) {
    const day = match[1].padStart(2, "0")
    const month = match[2].padStart(2, "0")
    const year = match[3]

    return `${year}${month}${day}`
  }

  return raw
}

function isUSZip(value) {
  return /^\d{5}(-\d{4})?$/.test(clean(value))
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
  const origin = req.headers.get("origin")

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    console.error("Origin not allowed:", origin)

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

  const key = process.env.SMARTMOVING_PROVIDER_KEY

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
    console.error("Invalid JSON:", err)

    return jsonResponse(
      req,
      {
        error: "Invalid JSON",
      },
      400
    )
  }

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
      "Missing name. Received payload:",
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

  const smartMovingLead = {}

  if (fullName) {
    smartMovingLead.fullName = fullName
  } else {
    smartMovingLead.firstName = firstName

    if (lastName) {
      smartMovingLead.lastName = lastName
    }
  }

  if (phoneNumber) {
    smartMovingLead.phoneNumber = phoneNumber
  }

  if (email) {
    smartMovingLead.email = email
  }

  if (moveDate) {
    smartMovingLead.moveDate = moveDate
  }

  if (moveSize) {
    smartMovingLead.moveSize = moveSize
  }

  if (referralSource) {
    smartMovingLead.referralSource = referralSource
  }

  if (phoneNumber) {
    smartMovingLead.userOptIn = userOptIn
  }

  if (movingFrom) {
    if (isUSZip(movingFrom)) {
      smartMovingLead.originZip = movingFrom
    } else {
      smartMovingLead.originAddressFull = movingFrom
    }
  }

  if (movingTo) {
    if (isUSZip(movingTo)) {
      smartMovingLead.destinationZip = movingTo
    } else {
      smartMovingLead.destinationAddressFull = movingTo
    }
  }

  const branchKey = firstValue(input.branch)
  const branchId = BRANCH_IDS[branchKey]

  let url =
    `${SMARTMOVING_URL}?providerKey=${encodeURIComponent(key)}`

  if (branchId) {
    url += `&branchId=${encodeURIComponent(branchId)}`
  }

  console.log(
    "Original form payload:",
    JSON.stringify(input)
  )

  console.log(
    "SmartMoving payload:",
    JSON.stringify(smartMovingLead)
  )

  console.log(
    "Branch:",
    branchKey || "not provided",
    "Branch ID:",
    branchId || "not configured"
  )

  try {
    const smResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smartMovingLead),
    })

    const responseText = await smResponse.text()

    console.log(
      "SmartMoving HTTP status:",
      smResponse.status
    )

    console.log(
      "SmartMoving response:",
      responseText || "(empty response)"
    )

    if (!smResponse.ok) {
      console.error(
        "SmartMoving rejected lead:",
        smResponse.status,
        responseText,
        JSON.stringify(smartMovingLead)
      )

      return jsonResponse(
        req,
        {
          ok: false,
          error: "SmartMoving rejected lead",
          smartMovingStatus: smResponse.status,
          smartMovingResponse: responseText,
        },
        smResponse.status
      )
    }

    console.log(
      "Lead submitted successfully to SmartMoving:",
      fullName || `${firstName} ${lastName}`,
      phoneNumber
    )

    return jsonResponse(
      req,
      {
        ok: true,
        smartMovingStatus: smResponse.status,
        smartMovingResponse: responseText || null,
      },
      200
    )
  } catch (err) {
    console.error(
      "Could not reach SmartMoving:",
      err,
      JSON.stringify(smartMovingLead)
    )

    return jsonResponse(
      req,
      {
        ok: false,
        error: "Upstream unavailable",
      },
      502
    )
  }
}

export const config = {
  path: "/api/lead",
}

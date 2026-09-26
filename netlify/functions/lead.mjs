const SMARTMOVING_URL =
    "https://api.smartmoving.com/api/leads/from-provider/v2"

// Optional: SmartMoving branch IDs so leads land in the right market.
const BRANCH_IDS = {
    bay: "",
    la: "",
    dfw: "",
}

const ALLOWED_ORIGINS = [
    "https://youthful-success-648235.framer.app",
    "https://www.zaptmovers.com",
    "https://zaptmovers.com",
    "https://zaptmovers.netlify.app",
]

function getCorsHeaders(req) {
    const origin = req.headers.get("origin")

    const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
    }
}

export default async (req) => {
    const corsHeaders = getCorsHeaders(req)

    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
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
                    ...corsHeaders,
                    "Content-Type": "application/json",
                    Allow: "POST, OPTIONS",
                },
            }
        )
    }

    const key = process.env.SMARTMOVING_PROVIDER_KEY

    if (!key) {
        console.error(
            "SMARTMOVING_PROVIDER_KEY environment variable is not set"
        )

        return new Response(
            JSON.stringify({
                error: "SMARTMOVING_PROVIDER_KEY is not set in Netlify environment variables",
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    }

    let lead

    try {
        lead = await req.json()
    } catch {
        return new Response(
            JSON.stringify({
                error: "Invalid JSON",
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    }

    if (!lead || (!lead.fullName && !lead.firstName)) {
        return new Response(
            JSON.stringify({
                error: "Missing name",
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    }

    if (lead.company) {
        return new Response(
            JSON.stringify({
                ok: true,
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    }

    delete lead.company

    let url = `${SMARTMOVING_URL}?providerKey=${encodeURIComponent(key)}`

    const branch = BRANCH_IDS[lead.branch]

    if (branch) {
        url += `&branchId=${encodeURIComponent(branch)}`
    }

    delete lead.branch

    try {
        const smResponse = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(lead),
        })

        const text = await smResponse.text()

        if (!smResponse.ok) {
            console.error(
                "SmartMoving rejected lead:",
                smResponse.status,
                text,
                JSON.stringify(lead)
            )

            return new Response(text, {
                status: smResponse.status,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/plain",
                },
            })
        }

        console.log(
            "Lead accepted by SmartMoving:",
            lead.firstName || lead.fullName,
            lead.phoneNumber
        )

        return new Response(
            JSON.stringify({
                ok: true,
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    } catch (err) {
        console.error(
            "Could not reach SmartMoving:",
            err,
            JSON.stringify(lead)
        )

        return new Response(
            JSON.stringify({
                error: "Upstream unavailable",
            }),
            {
                status: 502,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    }
}

export const config = {
    path: "/api/lead",
}

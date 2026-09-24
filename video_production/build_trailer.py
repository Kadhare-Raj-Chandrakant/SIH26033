import asyncio
import edge_tts
import os
import subprocess

VOICE = "en-IN-PrabhatNeural"  # Professional, crisp Indian English narration

SECTIONS = [
    {
        "id": "act1_problem",
        "text": (
            "Across India, over one hundred and forty million farmers work tirelessly to feed the nation. "
            "Yet, due to opaque market structures and middleman cartels, smallholders lose twenty to thirty-five percent "
            "of their harvest value before it ever reaches wholesale mandis. "
            "Farmers are forced into distress sales at local farmgate prices, completely unaware of real-time regional price arbitrage, "
            "while fragmented road logistics and lack of digital quality assaying leave them with no bargaining power. "
            "This is Smart India Hackathon Problem Statement 26033. And this is our definitive solution: Aroha."
        ),
    },
    {
        "id": "act2_rubric",
        "text": (
            "Addressing the core evaluation rubric of the Smart India Hackathon, "
            "Aroha is engineered around four key pillars. "
            "First, Novelty: A dynamic Multi-Channel Price Arbitrage Engine replacing static listing boards with real-time financial realization. "
            "Second, Technical Feasibility: Built on an enterprise-grade NestJS backend, Next.js frontend, Redis distributed caching, and PostGIS geospatial routing. "
            "Third, Socio-Economic Impact: Unlocking up to twelve thousand four hundred rupees in net profit alpha per truckload through collective FPO bargaining. "
            "And fourth, Inclusivity: Complete regional language localization tailored for Bharat's rural farming communities."
        ),
    },
    {
        "id": "act3_walkthrough_hero",
        "text": (
            "Let us explore the live prototype. "
            "On the Aroha platform, verified farmers and institutional buyers gain immediate access to real-time APMC price intelligence. "
            "Interactive commodity tickers track arrival volumes and modal prices across dozens of major agricultural hubs."
        ),
    },
    {
        "id": "act3_walkthrough_market",
        "text": (
            "The Marketplace Showcase connects verified crop lots directly with buyers. "
            "Our centered intelligent search bar, state-level filters, and real-time inventory indicators prevent ordering depleted stock, "
            "while digital assay certificates provide verifiable proof of moisture content and grain purity."
        ),
    },
    {
        "id": "act3_walkthrough_3d",
        "text": (
            "The heart of Aroha is the Three-D Price Realization Engine. "
            "By computing exact road mileage, fuel rates, loading fees, and transit insurance against five competing mandis, "
            "the system instantly determines the farmer's true net bank payout, removing all speculative guesswork from harvest logistics."
        ),
    },
    {
        "id": "act3_walkthrough_fpo",
        "text": (
            "To bridge the digital divide, Aroha features instant one-click regional localization in Hindi, Marathi, and regional languages. "
            "Smallholder farmers pool their harvests through the FPO Federation Hub, converting fragmented acreage into high-volume, bulk-negotiating power."
        ),
    },
    {
        "id": "act4_conclusion",
        "text": (
            "Backed by microservice architecture, cryptographic security, and automated dispute resolution, "
            "Aroha transforms agricultural commerce from distress liquidation into transparent, high-yield digital trade. "
            "Empowering every Indian farmer to realize their true harvest value. Thank you."
        ),
    }
]

async def generate_speech():
    os.makedirs("video_production/audio", exist_ok=True)
    for sec in SECTIONS:
        out_path = f"video_production/audio/{sec['id']}.mp3"
        print(f"Generating speech for {sec['id']}...")
        communicate = edge_tts.Communicate(sec["text"], VOICE, rate="+3%")
        await communicate.save(out_path)
        print(f"Saved {out_path}")

if __name__ == "__main__":
    asyncio.run(generate_speech())

import express from 'express';
import https from 'https';
import twilio from 'twilio';
import 'dotenv/config'

const app = express();
const port = 3003;
const host = '127.0.0.1';

// Configuration
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

// Ultravox configuration
const SYSTEM_PROMPT = `
I am Pooja, virtual receptionist at P D Hinduja Sindhi Hospital. CORE OBJECTIVES: 1) Answer patient questions accurately and concisely 2) Schedule appointments efficiently 3) Direct urgent concerns appropriately 4) Complete interactions quickly

NOISE HANDLING:
- If detecting background voices or multiple speakers: "I'll focus on the primary speaker. Please speak clearly."
- For coughing, laughing or sudden noises: Continue speaking without pausing or acknowledging these sounds
- In traffic or crowded environments: "I notice there's background noise. I'll speak clearly and focus on your voice."
- If connection breaks or voice fades: "I may have missed that. Could you repeat your question clearly?"
- For hospital equipment sounds (beeping): Ignore these sounds completely and maintain focus on the caller
- If interrupted mid-sentence: Stop completely, listen to caller input, then continue with updated information

COMMUNICATION STYLE:
- Start with "Hello, P D Hinduja Hospital. How may I help you?" then listen
- Use direct, brief responses focused on solving the patient's need
- Avoid unnecessary acknowledgments, pleasantries, or elaborations
- Never say the word "pause" while speaking

FOR APPOINTMENTS:
- Get only essential information: name, doctor needed, preferred time
- Offer specific options: "Dr. Sharma is available Monday 2pm or Wednesday 10am"
- Confirm details once and end call: "Appointment confirmed with Dr. Sharma, Monday 2pm. Anything else needed?"

FOR INQUIRIES:
- Provide specific information in 1-2 sentences
- Avoid explaining multiple options unless asked
- End with "Is there anything else?" and conclude if not

REMEMBER: Patients are often anxious or in pain. Respond quickly, solve their problem, and end the call efficiently. No patient should wait or hear unnecessary words.`;

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'Mark',
    temperature: 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    medium: { "twilio": {} }
};

// Create Ultravox call and get join URL
async function createUltravoxCall() {
    const request = https.request(ULTRAVOX_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ULTRAVOX_API_KEY
        }
    });

    return new Promise((resolve, reject) => {
        let data = '';

        request.on('response', (response) => {
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(JSON.parse(data)));
        });

        request.on('error', reject);
        request.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        request.end();
    });
}

app.get('/', (req, res) => {
    console.log('Home page accessed at:', new Date().toISOString());
    res.status(200).send('Hello World! Welcome to the Twilio Incoming Quickstart App');
});


// Handle incoming calls
app.post('/incoming', async (req, res) => {
    try {
        console.log('Incoming call received');
        const response = await createUltravoxCall();
        const twiml = new twilio.twiml.VoiceResponse();
        const connect = twiml.connect();
        connect.stream({
            url: response.joinUrl,
            name: 'ultravox'
        });

        const twimlString = twiml.toString();
        res.type('text/xml');
        res.send(twimlString);

    } catch (error) {
        console.error('Error handling incoming call:', error);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error connecting your call.');
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

// Start server
app.listen(port, host, () => {
    console.log(`Server running on ${host}:${port}`);
});
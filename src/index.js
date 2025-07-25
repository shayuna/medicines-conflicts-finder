import OpenAI from "openai";

export default {
	async fetch(request, env, ctx) {
        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        })
        
        try {
            // Check if the request is a POST with an image
            if (request.method !== 'POST') {
                return new Response('Method not allowed. Please use POST with an image.', { status: 405 });
            }

            // Get the image from the request body
            const formData = await request.formData();
            const imageFile = formData.get('image');
            
            if (!imageFile) {
                return new Response('No image provided. Please include an image in the form data with key "image".', { status: 400 });
            }

            // Convert the image to base64
            const imageBuffer = await imageFile.arrayBuffer();
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            const mimeType = imageFile.type || 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            const chatCompletion = await openai.chat.completions.create({
                model: 'gpt-4.1',
                messages: [
                    { 
                        role: 'assistant', 
                        content: 'בתמונה שהמשתמש מעלה אמורות להופיע תרופות. אתה צריך לתת תשובה בשני חלקים. אלף: רשימה של התרופות וחלק שני: קונפליקטים אפשריים בין תרופות ברשימה.' 
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: dataUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2500,
                temperature: 0.7
            })
            
            const response = chatCompletion.choices[0].message
            
            return new Response(JSON.stringify(response), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            })
        } catch(e) {
            return new Response(JSON.stringify({ error: e.message }), { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        }
	},
};
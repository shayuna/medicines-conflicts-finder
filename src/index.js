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

            // Check file size (limit to 10MB to be safe)
            const fileSize = imageFile.size;
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (fileSize > maxSize) {
                return new Response(`Image too large. Maximum size is 10MB. Current size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`, { 
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }

            // Convert the image to base64
            const imageBuffer = await imageFile.arrayBuffer();
            
            // Check if the base64 size would be too large (base64 increases size by ~33%)
            const base64Size = Math.ceil(imageBuffer.byteLength * 1.33);
            const maxBase64Size = 50 * 1024 * 1024; // 50MB base64 limit
            
            if (base64Size > maxBase64Size) {
                return new Response(`Image too large for processing. Please use a smaller image.`, { 
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            const mimeType = imageFile.type || 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            const chatCompletion = await openai.chat.completions.create({
                model: 'gpt-4o', // Updated to use gpt-4o which is more efficient
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
            console.error('Worker error:', e);
            return new Response(JSON.stringify({ error: e.message }), { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            })
        }
	},
};
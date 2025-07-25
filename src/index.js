import OpenAI from "openai";

export default {
	async fetch(request, env, ctx) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // Check if the request is a POST with an image
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Please use POST with an image.' }), { 
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        })
        
        try {
            console.log('Processing request...');
            
            // Get the image from the request body
            const formData = await request.formData();
            const imageFile = formData.get('image');
            
            console.log('Image file received:', {
                name: imageFile?.name,
                size: imageFile?.size,
                type: imageFile?.type
            });
            
            if (!imageFile) {
                return new Response(JSON.stringify({ error: 'No image provided. Please include an image in the form data with key "image".' }), { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }

            // Check file size (limit to 10MB to be safe)
            const fileSize = imageFile.size;
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (fileSize > maxSize) {
                return new Response(JSON.stringify({ 
                    error: `Image too large. Maximum size is 10MB. Current size: ${(fileSize / 1024 / 1024).toFixed(2)}MB` 
                }), { 
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }

            // Convert the image to base64 with better error handling
            let imageBuffer;
            try {
                imageBuffer = await imageFile.arrayBuffer();
            } catch (bufferError) {
                console.error('Error reading image buffer:', bufferError);
                return new Response(JSON.stringify({ error: 'Failed to read image file. Please try with a different image.' }), { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
            // Check if the base64 size would be too large (base64 increases size by ~33%)
            const base64Size = Math.ceil(imageBuffer.byteLength * 1.33);
            const maxBase64Size = 50 * 1024 * 1024; // 50MB base64 limit
            
            if (base64Size > maxBase64Size) {
                return new Response(JSON.stringify({ error: 'Image too large for processing. Please use a smaller image.' }), { 
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
            // Convert to base64 with better error handling
            let base64Image;
            try {
                const uint8Array = new Uint8Array(imageBuffer);
                
                // For very large images, process in chunks to avoid memory issues
                if (uint8Array.length > 5 * 1024 * 1024) { // 5MB threshold
                    // Process in chunks of 1MB
                    const chunkSize = 1024 * 1024;
                    const chunks = [];
                    
                    for (let i = 0; i < uint8Array.length; i += chunkSize) {
                        const chunk = uint8Array.slice(i, i + chunkSize);
                        const chunkString = String.fromCharCode(...chunk);
                        chunks.push(chunkString);
                    }
                    
                    const fullString = chunks.join('');
                    base64Image = btoa(fullString);
                } else {
                    // For smaller images, use the direct method
                    base64Image = btoa(String.fromCharCode(...uint8Array));
                }
            } catch (base64Error) {
                console.error('Error converting to base64:', base64Error);
                return new Response(JSON.stringify({ error: 'Failed to process image. Please try with a smaller image.' }), { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
            const mimeType = imageFile.type || 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64Image}`;
            
            console.log('Image processed successfully:', {
                originalSize: imageBuffer.byteLength,
                base64Size: base64Image.length,
                mimeType: mimeType
            });

            // Call OpenAI API with better error handling
            let chatCompletion;
            try {
                chatCompletion = await openai.chat.completions.create({
                    model: 'gpt-4o',
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
                });
            } catch (openaiError) {
                console.error('OpenAI API error:', openaiError);
                
                // Handle specific OpenAI errors
                if (openaiError.status === 429) {
                    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few minutes.' }), { 
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                        }
                    });
                } else if (openaiError.status === 400) {
                    return new Response(JSON.stringify({ error: 'Invalid image format. Please try with a different image.' }), { 
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                        }
                    });
                } else {
                    return new Response(JSON.stringify({ error: 'Failed to analyze image. Please try again.' }), { 
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                        }
                    });
                }
            }
            
            const response = chatCompletion.choices[0].message;
            
            return new Response(JSON.stringify(response), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
            
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
            });
        }
	},
};
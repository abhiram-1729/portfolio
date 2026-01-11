import os
import json
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Set up Google's Gemini SDK
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

# Define the model with tools
# The weather tool is just a standard python function
async def lookup_weather(city: str):
    """Get the current weather for a city."""
    # Add a little delay to make it feel real
    await asyncio.sleep(1) 
    return {"city": city, "temperature": "72F", "condition": "Sunny", "humidity": "45%"}

tools = [lookup_weather]

# Spin up the Gemini model instance
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    tools=tools
)

def convert_messages_to_prompt(messages):
    """
    Map OpenAI-style messages over to what Gemini expects.
    Gemini uses a chat session or a specific history format.
    """
    history = []
    # We'll handle the system prompt specifically if it pops up
    system_instruction = None
    
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")
        
        if role == "system":
            system_instruction = content
        elif role == "user":
            history.append({"role": "user", "parts": [content]})
        elif role == "assistant":
            # Check if the assistant wanted to run a tool
            parts = []
            if content:
                parts.append(content)
            
            if "tool_calls" in msg:
                for tc in msg["tool_calls"]:
                    # Reformat tool calls for Gemini's API
                    parts.append({
                        "function_call": {
                            "name": tc["function"]["name"],
                            "args": json.loads(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], str) else tc["function"]["arguments"]
                        }
                    })
            history.append({"role": "model", "parts": parts})
        elif role == "tool" or role == "function":
            # Map the tool's output back to the model history
            history.append({
                "role": "model", # Tool results go into a 'model' role with a function_response part
                "parts": [{
                    "function_response": {
                        "name": msg["name"],
                        "response": {"result": msg["content"]}
                    }
                }]
            })
    
    return history, system_instruction

async def stream_response(messages):
    """
    Stream the AI response chunk by chunk.
    If the AI asks for a tool, we run it and feed the result back.
    """
    try:
        # Get the history ready for the API call
        gemini_history, system_instruction = convert_messages_to_prompt(messages[:-1]) # History excluding last user message
        user_message = messages[-1]["content"]

        # Start a new conversational session
        chat = model.start_chat(history=gemini_history)
        
        # Assuming the model setup handles the system prompt for now
        
        response = await chat.send_message_async(user_message, stream=True)

        async for chunk in response:
            # Make sure the API actually returned something useful
            if not chunk.candidates:
                continue
            
            candidate = chunk.candidates[0]
            if not candidate.content or not candidate.content.parts:
                continue

            for part in candidate.content.parts:
                # Send any plain text tokens back to the client
                if part.text:
                    yield part.text
                
                # Oh, the AI wants to use a tool!
                if part.function_call:
                    fn_name = part.function_call.name
                    fn_args = part.function_call.args
                    
                    yield f"System: Executing tool {fn_name} with params {dict(fn_args)}...\n"
                    
                    # Time to run the actual python code for the tool
                    if fn_name == "lookup_weather":
                        result = await lookup_weather(**fn_args)
                        
                        # Pass the tool's findings back to the AI for its final answer
                        response_with_tool = await chat.send_message_async(
                            genai.protos.Content(
                                parts=[genai.protos.Part(
                                    function_response=genai.protos.FunctionResponse(
                                        name=fn_name,
                                        response=result
                                    )
                                )]
                            ),
                            stream=True
                        )
                        
                        async for tool_chunk in response_with_tool:
                            if tool_chunk.text:
                                yield tool_chunk.text

    except Exception as e:
        yield f"Error in LLM service: {str(e)}"

async def generate_summary(history_text: str):
    """Create a quick recap of the whole chat."""
    try:
        # Using a lighter model for the summary task
        summary_model = genai.GenerativeModel("gemini-2.0-flash-lite")
        prompt = f"Summarize the following conversation concisely:\n\n{history_text}"
        response = await summary_model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        return f"Error generating summary: {e}"

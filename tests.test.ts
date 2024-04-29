
import { Cohere, CohereClient } from "cohere-ai";
import OpenAI from "openai";
import { z } from "zod";
import { JsonSchema7TypeUnion, zodToJsonSchema } from "zod-to-json-schema";
import { convert, unconvert } from ".";

const message = "my friend is called John and he is 25 years old. He likes the color blue and his favorite food is pizza. Add him to the databse!"

const testSchema: JsonSchema7TypeUnion = {
    type: "object",
    required: ["name", "age"],
    properties: {
        name: {
            type: "string",
            description: "name"
        },
        age: {
            type: "number",
            description: "age",
        },
        preferences: {
            type: "object",
            properties: {
                color: {
                    type: "string",
                    description: "color"
                },
                food: {
                    type: "string",
                    description: "food"
                }
            }
        }
    }
}

const expected: Cohere.Tool["parameterDefinitions"] = {
    name: {
        description: "name",
        type: "str",
        required: true
    },
    age: {
        description: "age",
        type: "float",
        required: true
    },
    "preferences__color": {
        description: "color",
        type: "str",
        required: false
    },
    "preferences__food": {
        description: "food",
        type: "str",
        required: false
    }
}


const Person = z.object({
    name: z.string({ description: "name" }),
    age: z.number({ description: "age" }),
    preferences: z.object({
        color: z.string({ description: "color" }).optional(),
        food: z.string({ description: "food" }).optional()
    })
});

test('test convert', () => {
    expect(convert(testSchema)).toEqual(expected);
});

test('test unconvert', () => {
    expect(unconvert(expected)).toEqual(testSchema);
});

test('zod test', () => {
    const jsonSchema = zodToJsonSchema(Person);

    expect(convert(jsonSchema)).toEqual(expected);
});

test('openai usage', async () => {
    // set OPENAI_API_KEY in your environment variables
    const openai = new OpenAI();

    const jsonSchema = zodToJsonSchema(Person);


    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: message }],
        model: 'gpt-3.5-turbo',
        tools: [{
            function: {
                name: 'addPersonToDatabase',
                description: 'Adds a person to the database',
                parameters: jsonSchema
            },
            type: 'function'
        }]
    });

    expect(JSON.parse(chatCompletion.choices[0].message.tool_calls?.[0].function.arguments)).toEqual({
        name: "John",
        age: 25,
        preferences: {
            color: "blue",
            food: "pizza"
        }
    });

})

test('cohere usage', async () => {
    // set CO_API_KEY in your environment variables
    const cohere = new CohereClient();

    const jsonSchema = zodToJsonSchema(Person);
    const parameterDefinitions = convert(jsonSchema);

    const chatCompletion = await cohere.chat({
        message,
        tools: [{
            name: 'addPersonToDatabase',
            description: 'Adds a person to the database',
            parameterDefinitions
        }]
    });

    const params = unconvert(chatCompletion.toolCalls?.[0].parameters)

    expect(params).toEqual({
        name: "John",
        age: 25,
        preferences: {
            color: "blue",
            food: "pizza"
        }
    });
})
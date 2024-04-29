
import { Cohere, CohereClient } from "cohere-ai";
import OpenAI from "openai";
import { z } from "zod";
import { JsonSchema7TypeUnion, zodToJsonSchema } from "zod-to-json-schema";
import { convert, unconvert } from ".";

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

const expected: Cohere.Tool = {
    name: "toolname",
    description: "tooldescription",
    parameterDefinitions: {
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
        "preferences.color": {
            description: "color",
            type: "str",
            required: false
        },
        "preferences.food": {
            description: "food",
            type: "str",
            required: false
        }
    },
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
    expect(convert("toolname", "tooldescription", testSchema)).toEqual(expected);
});

test('test unconvert', () => {
    expect(unconvert(expected)).toEqual(testSchema);
});

test('zod test', () => {
    const jsonSchema = zodToJsonSchema(Person);

    expect(convert("toolname", "tooldescription", jsonSchema)).toEqual(expected);
});

test('openai usage', async () => {
    // set OPENAI_API_KEY in your environment variables
    const openai = new OpenAI();

    const jsonSchema = zodToJsonSchema(Person);


    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'Say this is a test' }],
        model: 'gpt-3.5-turbo',
        tools: [{
            function: {
                name: 'toolname',
                description: 'tooldescription',
                parameters: jsonSchema
            },
            type: 'function'
        }]
    });
})

test('cohere usage', async () => {
    // set CO_API_KEY in your environment variables
    const cohere = new CohereClient();

    const jsonSchema = zodToJsonSchema(Person);
    const cohereSchema = convert("toolname", "tooldescription", jsonSchema);

    const chatCompletion = await cohere.chat({
        message: "Say this is a test",
        tools: [{
            name: 'toolname',
            description: 'tooldescription',
            parameterDefinitions: cohereSchema.parameterDefinitions
        }]
    });

})
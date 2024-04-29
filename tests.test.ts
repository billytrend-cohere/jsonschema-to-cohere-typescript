
import { Cohere } from "cohere-ai";
import { JsonSchema7TypeUnion } from "zod-to-json-schema";
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

test('test convert', () => {
    expect(convert("toolname", "tooldescription", testSchema)).toEqual(expected);
});
test('test unconvert', () => {
    expect(unconvert(expected)).toEqual(testSchema);
});
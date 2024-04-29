
import { Cohere } from "cohere-ai";
import { JsonSchema7LiteralType, JsonSchema7ObjectType, JsonSchema7TypeUnion } from "zod-to-json-schema";


export const convert = (schema: JsonSchema7TypeUnion): Cohere.Tool["parameterDefinitions"] => {
    return flattenObject(schema)
}

export const unconvert = (tool: Cohere.Tool["parameterDefinitions"]): JsonSchema7ObjectType => {
    return unflattenObject(tool);
}

const flattenObject = (schema: JsonSchema7ObjectType, prefix: string = ""): Cohere.Tool["parameterDefinitions"] => {
    let result: Cohere.Tool["parameterDefinitions"] = {};
    for (const [key, value] of Object.entries(schema.properties)) {
        const path = [prefix, key].filter(Boolean).join(".")
        if (value.type === "object") {
            result = { ...result, ...flattenObject(value, path) };
        } else {
            result[path] = {
                description: value.description,
                type: convertToPythonType(value.type),
                required: schema.required?.includes(key) ?? false
            }
        }
    }
    return result;
}

const unflattenObject = (parameterDefinitions: Cohere.Tool["parameterDefinitions"]): JsonSchema7ObjectType => {
    let result: JsonSchema7ObjectType = {
        type: "object",
        properties: {},
        required: []
    };

    for (const [key, value] of Object.entries(parameterDefinitions)) {
        const path = key.split(".");
        let current = result;
        for (let i = 0; i < path.length - 1; i++) {
            if (current.properties[path[i]] === undefined) {
                current.properties[path[i]] = {
                    type: "object",
                    properties: {},
                }
            }

            current = current.properties[path[i]] as JsonSchema7ObjectType;
        }
        if (value.required) {
            if (current.required === undefined) {
                current.required = [];
            }
            current.required = [...current.required, path[path.length - 1]];
        }
        current.properties[path[path.length - 1]] = {
            type: convertFromPythonType(value.type),
            description: value.description
        }
    }
    return result;
}

// JSON SCHEMA TYPE	PYTHON TYPE
// string	str
// number (float type)	float
// number (integer type)	int
// boolean	bool
// object	Dict
// object (with specific types)	Dict[str, int]
// array	List
// array (with specific types)	List[str]
// array (nested with specific types)	List[List[str]]
// n/a	Custom Python classes such as a dataclass (see examples below)

const convertToPythonType = (type: JsonSchema7LiteralType["type"]): string => {
    switch (type) {
        case "string":
            return "str";
        case "number":
            return "float";
        case "object":
            return "Dict";
        case "array":
            return "List";
        default:
            return type;
    }
}

const convertFromPythonType = (type: string): JsonSchema7LiteralType["type"] => {
    switch (type) {
        case "str":
            return "string";
        case "float":
            return "number";
        case "int":
            return "number";
        case "bool":
            return "boolean";
        case "Dict":
            return "object";
        case "List":
            return "array";
        default:
            throw new Error(`Unknown type ${type}`);
    }
}
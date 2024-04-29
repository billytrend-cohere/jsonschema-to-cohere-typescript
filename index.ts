
import { Cohere } from "cohere-ai";
import { JsonSchema7LiteralType, JsonSchema7ObjectType } from "zod-to-json-schema";

const nestDelimiter = "__";

type ParameterDefinitions = Required<Cohere.Tool["parameterDefinitions"]>;

export const convert = (schema: JsonSchema7ObjectType): ParameterDefinitions => {
    return flattenObject(schema)
}

export const unconvert = (tool: object): object => {
    return unflattenObject(tool);
}

const flattenObject = (schema: JsonSchema7ObjectType, prefix: string = ""): ParameterDefinitions => {
    let result: ParameterDefinitions = {};
    for (const [key, value] of Object.entries(schema.properties)) {
        const path = [prefix, key].filter(Boolean).join(nestDelimiter)

        if (!("type" in value)) {
            throw new Error("Type is missing from schema");
        }

        if (value.type === "object") {
            result = { ...result, ...flattenObject(value as JsonSchema7ObjectType, path) };
        } else {
            result[path] = {
                description: value.description,
                type: convertToPythonType(value.type as JsonSchema7LiteralType["type"]),
                required: schema.required?.includes(key) ?? false
            }
        }
    }
    return result;
}

const unflattenObject = (params: object): object => {
    let result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
        const path = key.split(nestDelimiter);
        let current: Record<string, unknown> = result;
        for (let i = 0; i < path.length - 1; i++) {
            if (current[path[i]] === undefined) {
                current[path[i]] = {}
            }

            current = current[path[i]] as Record<string, unknown>;
        }
        current[path[path.length - 1]] = value
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
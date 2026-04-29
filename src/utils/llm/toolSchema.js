export const TOOL_NAME = 'submit_atomic_test';

export const TOOL_DESCRIPTION =
    'Submit either a generated atomic test or a polite refusal. Always call this tool exactly once and do not produce any other output.';

const platformEnum = [
    'windows', 'macos', 'linux', 'office-365', 'azure-ad',
    'google-workspace', 'containers', 'iaas', 'iaas:gcp', 'iaas:aws', 'iaas:azure', 'saas',
];

const executorEnum = ['powershell', 'command_prompt', 'bash', 'sh', 'manual'];
const argTypeEnum = ['string', 'path', 'url', 'integer', 'float'];

export const TOOL_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        action: {
            type: 'string',
            enum: ['generate', 'refuse'],
            description: 'generate to return a test, refuse to politely decline.',
        },
        reason: {
            type: 'string',
            description: 'When action=refuse, a one-sentence polite reason.',
        },
        test_data: {
            type: 'object',
            description: 'When action=generate, the atomic test definition.',
            properties: {
                attack_technique: {
                    type: 'string',
                    description: 'MITRE ATT&CK technique ID (T#### or T####.###).',
                    pattern: '^T\\d{4}(\\.\\d{3})?$',
                },
                display_name: {
                    type: 'string',
                    description: 'Canonical MITRE technique name.',
                },
                atomic_tests: {
                    type: 'array',
                    minItems: 1,
                    description:
                        'One or more atomic test variants for the chosen technique. Return MULTIPLE entries when the technique applies to multiple platforms with different commands per platform (e.g. windows uses sc, linux uses systemctl). Use a SINGLE entry with multi-platform supported_platforms only when the same command works on all of them (e.g. sh on both linux and macos).',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            supported_platforms: {
                                type: 'array',
                                items: { type: 'string', enum: platformEnum },
                                minItems: 1,
                            },
                            executor: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', enum: executorEnum },
                                    command: { type: 'string' },
                                    cleanup_command: { type: 'string' },
                                    elevation_required: { type: 'boolean' },
                                },
                                required: ['name', 'command'],
                            },
                            input_arguments: {
                                type: 'object',
                                description:
                                    'Keyed map of argument_name -> { type, default, description }. Reference inside command via #{argument_name}.',
                                additionalProperties: {
                                    type: 'object',
                                    properties: {
                                        type: { type: 'string', enum: argTypeEnum },
                                        default: {},
                                        description: { type: 'string' },
                                    },
                                    required: ['type', 'description'],
                                },
                            },
                            dependency_executor_name: { type: 'string', enum: executorEnum },
                            dependencies: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string' },
                                        prereq_command: { type: 'string' },
                                        get_prereq_command: { type: 'string' },
                                    },
                                    required: ['description', 'prereq_command'],
                                },
                            },
                            auto_generated_guid: {
                                type: 'string',
                                pattern:
                                    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                            },
                        },
                        required: ['name', 'description', 'supported_platforms', 'executor'],
                    },
                },
            },
            required: ['attack_technique', 'display_name', 'atomic_tests'],
        },
    },
    required: ['action'],
};

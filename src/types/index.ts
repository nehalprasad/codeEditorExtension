export interface HemingwayConfig {
    maxWordCount: number;
    readabilityScore: number;
    tone: 'formal' | 'informal' | 'neutral';
}

export interface CommandParameters {
    text: string;
    options?: HemingwayConfig;
}

export type ExtensionStatus = 'active' | 'inactive' | 'error';
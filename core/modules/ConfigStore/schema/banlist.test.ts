import { suite, it, expect } from 'vitest';
import { replaceBanReasonSpacers, BanTemplateSpacerType } from './banlist';

suite('Ban Template Spacers', () => {
    const testSpacers: BanTemplateSpacerType[] = [
        { name: 'player_name', placeholder: '[PLAYER]' },
        { name: 'violation', placeholder: '[VIOLATION]' },
        { name: 'server_rule', placeholder: '[RULE]' }
    ];

    it('should replace spacers with provided values', () => {
        const reason = 'Player {{player_name}} violated {{violation}} on our server.';
        const values = { 
            player_name: 'John Doe', 
            violation: 'RDM'
        };
        
        const result = replaceBanReasonSpacers(reason, testSpacers, values);
        expect(result).toBe('Player John Doe violated RDM on our server.');
    });

    it('should use placeholder values when no values provided', () => {
        const reason = 'Player {{player_name}} violated {{violation}}.';
        const values = {};
        
        const result = replaceBanReasonSpacers(reason, testSpacers, values);
        expect(result).toBe('Player [PLAYER] violated [VIOLATION].');
    });

    it('should handle partial replacement', () => {
        const reason = 'Player {{player_name}} violated {{violation}} and {{server_rule}}.';
        const values = { 
            player_name: 'Jane Smith'
        };
        
        const result = replaceBanReasonSpacers(reason, testSpacers, values);
        expect(result).toBe('Player Jane Smith violated [VIOLATION] and [RULE].');
    });

    it('should handle multiple occurrences of same spacer', () => {
        const reason = '{{player_name}} was banned. {{player_name}} cannot rejoin.';
        const values = { 
            player_name: 'Bad Player'
        };
        
        const result = replaceBanReasonSpacers(reason, testSpacers, values);
        expect(result).toBe('Bad Player was banned. Bad Player cannot rejoin.');
    });

    it('should handle text without spacers', () => {
        const reason = 'Standard ban reason without any placeholders.';
        const values = { 
            player_name: 'Test Player'
        };
        
        const result = replaceBanReasonSpacers(reason, testSpacers, values);
        expect(result).toBe('Standard ban reason without any placeholders.');
    });

    it('should handle empty spacers array', () => {
        const reason = 'Player {{player_name}} was banned.';
        const values = { 
            player_name: 'Test Player'
        };
        
        const result = replaceBanReasonSpacers(reason, [], values);
        expect(result).toBe('Player {{player_name}} was banned.');
    });
});
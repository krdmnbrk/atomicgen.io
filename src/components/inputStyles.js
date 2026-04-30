// Shared sx for filled-variant TextField / FormControl that mimics the
// "inside-floating label" mockup (public/mockups/text-input/2-floating-inside).
// Use with `variant="filled"` and pass via `sx={inputSx}`.
export const inputSx = {
    '& .MuiFilledInput-root': {
        backgroundColor: 'var(--glass-inset)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'var(--glass-stroke)',
        transition: 'border-color .15s, background-color .15s, box-shadow .15s',
        overflow: 'hidden',
        fontSize: 14,
        '& .MuiFilledInput-input, & .MuiSelect-select': { fontSize: 14 },
        '&:before, &:after': { display: 'none' },
        '&:hover': {
            backgroundColor: 'var(--glass-inset)',
            borderColor: 'var(--glass-stroke-strong)',
        },
        '&.Mui-focused': {
            backgroundColor: 'var(--glass-inset)',
            borderColor: 'primary.main',
            boxShadow: '0 0 0 3px var(--accent-soft)',
        },
        '&.Mui-error': {
            borderColor: 'error.main',
        },
        // Hide placeholder when label is at rest so it does not collide.
        '& input::placeholder, & textarea::placeholder': {
            color: 'transparent',
            opacity: 1,
        },
        '&.Mui-focused input::placeholder, &.Mui-focused textarea::placeholder': {
            color: 'var(--text-faint)',
            opacity: 1,
        },
    },
    '& .MuiInputLabel-root': {
        fontSize: 14,
        color: 'var(--text-faint)',
        '&.Mui-focused': { color: 'primary.main' },
        '&.MuiInputLabel-shrink': {
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
        },
    },
};

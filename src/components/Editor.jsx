import React from 'react';
import AceEditor from 'react-ace';

// Importing language modes for the Ace Editor
import 'ace-builds/src-noconflict/mode-powershell';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-yaml';

// Importing the theme for the Ace Editor
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-github_light_default';
// Liquid Glass overrides — must be imported AFTER the base themes so the
// !important rules override Ace's own .ace-tomorrow-night-bright / etc.
import './editorTheme.css';

// Editor component definition
const Editor = ({
    onChange,               // Callback function for when the content changes
    mode,                   // Language mode (e.g., powershell, sh, yaml)
    name,                   // Unique name for the editor instance
    value,                  // Initial or current value of the editor
    height,                 // Height of the editor
    fontSize,               // Font size for the editor text
    readOnly,               // Read-only mode flag
    highlightActiveLine,    // Highlight the currently active line
    highlightGutterLine,    // Highlight the line number in the gutter
    maxLines,               // Maximum number of lines before scrolling
    placeholder,            // Placeholder text when editor is empty
    wrap,                   // Text wrapping toggle
    darkMode                // Dark mode toggle
}) => {
    return (
        <AceEditor
            // Setting the programming language mode (e.g., YAML, PowerShell, Shell)
            mode={mode}
            // Applying the "Tomorrow Night Bright" theme for dark mode
            theme={darkMode ? "tomorrow_night_bright" : "github_light_default"}
            // Callback function triggered when the editor content changes
            onChange={onChange}
            // Setting font size or defaulting to 14px
            fontSize={fontSize ? fontSize : 14}
            // Unique identifier for this editor instance
            name={name}
            // Preventing the editor from continuously scrolling
            editorProps={{ $blockScrolling: true }}
            // Current value or text content of the editor
            value={value}
            // Setting keyboard shortcuts handler (e.g., VSCode key bindings)
            setKeyboardHandler="ace/keyboard/vscode"
            // Highlight the active line; default is true
            highlightActiveLine={highlightActiveLine !== undefined ? highlightActiveLine : true}
            // Highlight the line number in the gutter; default is true
            highlightGutterLine={highlightGutterLine !== undefined ? highlightGutterLine : true}
            // Placeholder text for empty editor
            placeholder={placeholder ? placeholder : ""}
            // Additional options for editor configuration
            setOptions={{
                minLines: 3, // Minimum number of lines visible
                maxLines: maxLines !== undefined ? maxLines : 20, // Maximum lines before scrolling
                showPrintMargin: false, // Disable print margin indicator
                wrap: wrap !== undefined ? wrap : true, // Enable/disable text wrapping
                useWorker: false, // Disable web workers for syntax checking
                enableMobileMenu: false, // Disable mobile-specific menu
            }}
            // Set the width to full parent width
            width="100%"
            // Set the height of the editor
            height={height}
            // Read-only mode; default is false
            readOnly={readOnly !== undefined ? readOnly : false}
        />
    );
};

// Export the Editor component for use in other parts of the application
export default Editor;

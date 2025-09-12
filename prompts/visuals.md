# Process Flow Explorer — General UI Style Principles

1. Overall  
- Minimal, clean, and modern.  
- The process diagram is always the main focus.  
- Controls are lightweight and never compete visually with the diagram.  

2. Typography  
- Use Inter font (or Segoe UI, Roboto, Arial fallback).  
- Small sizes for labels (12–14 px), medium for headings (18 px).  
- Use semibold for emphasis, regular otherwise.  

3. Colors  
- Background: white or very light gray.  
- Text: dark gray (#111827) with muted gray for secondary (#6B7280).  
- Borders: subtle light gray (#E5E7EB).  
- Shadows: very soft, used sparingly.  
- Color is reserved for edges (variants). Nodes remain neutral.  

4. Nodes  
- Rounded rectangles with 12 px corner radius.  
- White fill, subtle border.  
- Label centered, dark text.  
- Selected node gets a light blue tint background.  

5. Edges  
- Smooth curved lines.  
- Thickness represents frequency (2–6 px).  
- Color represents variant, using gradient hues.  
- Non-selected edges fade in opacity.  


7. Context Menu  
- White card with rounded corners and soft shadow.  
- Each item is icon + label, no chevrons, no submenus.  

8. Legend  
- Fixed footer strip.  
- Text only  

9. Interaction Principles  
- Animations should be smooth and subtle (200 ms springy ease).  
- Hover: soft shadow or tint.  
- Focus: clear blue ring.  
- Always provide clear feedback on selection and actions.  

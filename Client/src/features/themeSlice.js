import { createSlice } from "@reduxjs/toolkit";

const getInitialTheme = () => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("theme") || "light";
    }
    return "light";
};

const initialState = {
    theme: getInitialTheme(),
};

const themeSlice = createSlice({
    name: "theme",
    initialState,
    reducers: {
        toggleTheme: (state) => {
            const theme = state.theme === "light" ? "dark" : "light";
            localStorage.setItem("theme", theme);
            document.documentElement.classList.toggle("dark");
            state.theme = theme;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        loadTheme: (state) => {
            const theme = localStorage.getItem("theme");
            if (theme) {
                state.theme = theme;
                if (theme === "dark") {
                    document.documentElement.classList.add("dark");
                }
            }
        },
    },
});

export const { toggleTheme, setTheme, loadTheme } = themeSlice.actions;
export default themeSlice.reducer;
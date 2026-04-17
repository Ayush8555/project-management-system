import apiClient from "./api";

/**
 * Standard fetcher for SWR.
 * Automatically ties into the existing deduplicated apiClient and auth flow.
 * 
 * Usage:
 * const { data, error, isLoading } = useSWR('/endpoint', fetcher);
 */
export const fetcher = async (url) => {
    // Determine if it's a relative URL
    if (url.startsWith('/')) {
        // apiClient assumes endpoints don't start with /api since its base URL already has it
        const cleanUrl = url.startsWith('/api') ? url.replace('/api', '') : url;
        return await apiClient.get(cleanUrl);
    }
    
    // Fallback for full URLs
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    
    return response.json();
};

export default fetcher;

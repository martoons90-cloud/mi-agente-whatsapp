import { popularBrands, popularModels, commonVersions } from '../data/argentinaCars';

import { config } from '../config';

const API_BASE_URL = `${config.apiBaseUrl}/api/ml`;

// Helper to fetch via AllOrigins Public Proxy
const fetchViaProxy = async (targetUrl) => {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Proxy Failed');
    return await response.json();
};

export const MercadoLibreService = {
    getBrands: async () => {
        // 1. Try DIRECT Browser Fetch (Priority 1)
        try {
            console.log('Attempting Direct Browser Fetch...');
            const mlUrl = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744';
            const response = await fetch(mlUrl);
            if (response.ok) {
                const data = await response.json();
                const brandFilter = data.available_filters?.find(f => f.id === 'BRAND');
                if (brandFilter) {
                    const brands = brandFilter.values.sort((a, b) => a.name.localeCompare(b.name));
                    brands._source = 'api-direct';
                    return brands;
                }
            }
        } catch (directError) {
            console.warn('Direct Browser Fetch failed:', directError);
        }

        try {
            // 2. Try Local Backend
            const response = await fetch(`${API_BASE_URL}/brands`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    data._source = 'api-local';
                    return data;
                }
            }
            throw new Error('Local Backend Failed');
        } catch (localError) {
            console.warn('Local Backend failed:', localError);

            // 3. Try Public Proxy (Last Resort)
            try {
                const mlUrl = 'https://api.mercadolibre.com/sites/MLA/search?category=MLA1744';
                const data = await fetchViaProxy(mlUrl);
                const brandFilter = data.available_filters?.find(f => f.id === 'BRAND');
                if (brandFilter) {
                    const brands = brandFilter.values.sort((a, b) => a.name.localeCompare(b.name));
                    brands._source = 'api-proxy';
                    return brands;
                }
            } catch (proxyError) {
                console.warn('Public Proxy failed:', proxyError);
            }

            // 4. MOCK MODE (DISABLED For Verification)
            console.warn('Network blocked & Mock Mode DISABLED. Returning empty list.');
            return [];

            /*
            console.warn('Network blocked. Activating MOCK MODE.');
            const mockBrands = [
                { id: 'VOLKSWAGEN', name: 'Volkswagen' },
                { id: 'FORD', name: 'Ford' },
                // ...
            ].sort((a, b) => a.name.localeCompare(b.name));
            mockBrands._source = 'api-mock';
            return mockBrands;
            */
        }
    },

    getModels: async (brandId) => {
        // 1. Try DIRECT Browser Fetch (Priority 1)
        try {
            const mlUrl = `https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&BRAND=${brandId}`;
            const response = await fetch(mlUrl);
            if (response.ok) {
                const data = await response.json();
                const modelFilter = data.available_filters?.find(f => f.id === 'MODEL');
                if (modelFilter) {
                    return modelFilter.values.sort((a, b) => a.name.localeCompare(b.name));
                }
            }
        } catch (e) { console.warn('Direct fetch failed for models'); }

        try {
            // 2. Try Local Backend
            const response = await fetch(`${API_BASE_URL}/models?brandId=${brandId}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) return data;
            }
            throw new Error('Local Backend Failed');
        } catch (localError) {
            // 3. Try Public Proxy
            try {
                const mlUrl = `https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&BRAND=${brandId}`;
                const data = await fetchViaProxy(mlUrl);
                const modelFilter = data.available_filters?.find(f => f.id === 'MODEL');
                if (modelFilter) {
                    return modelFilter.values.sort((a, b) => a.name.localeCompare(b.name));
                }
            } catch (e) { }

            // 4. Mock Mode (DISABLED For Verification)
            return [];
            /*
            const staticModelData = popularModels[brandId] || [];
            if (staticModelData.length > 0) {
                staticModelData._source = 'api-mock';
                return staticModelData;
            }
            return [];
            */

        }
    },

    getYears: async (brandId, modelId) => {
        const currentYear = new Date().getFullYear() + 1;
        const startYear = 1990;
        const years = [];
        for (let y = currentYear; y >= startYear; y--) {
            years.push({ id: y.toString(), name: y.toString() });
        }
        return years;
    },

    getVersions: async (brandId, modelId, yearId) => {
        // 1. Try DIRECT Browser Fetch (Priority 1)
        try {
            let mlUrl = `https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&BRAND=${brandId}&MODEL=${modelId}`;
            if (yearId) mlUrl += `&VEHICLE_YEAR=${yearId}`;

            const response = await fetch(mlUrl);
            if (response.ok) {
                const data = await response.json();
                const versionFilter = data.available_filters?.find(f => f.id === 'VEHICLE_VERSION' || f.id === 'TRIM');
                if (versionFilter) {
                    return versionFilter.values.map(v => ({ id: v.id, name: v.name }));
                }
            }
        } catch (e) { console.warn('Direct fetch failed for versions'); }

        try {
            // 2. Try Local Backend
            let query = `brandId=${brandId}&modelId=${modelId}`;
            if (yearId) query += `&yearId=${yearId}`;

            const response = await fetch(`${API_BASE_URL}/versions?${query}`);
            if (response.ok) {
                const data = await response.json();
                if (data.versions && data.versions.length > 0) return data.versions;
            }
            throw new Error('Local Backend Failed');
        } catch (error) {
            // 3. Try Public Proxy
            try {
                let mlUrl = `https://api.mercadolibre.com/sites/MLA/search?category=MLA1744&BRAND=${brandId}&MODEL=${modelId}`;
                if (yearId) mlUrl += `&VEHICLE_YEAR=${yearId}`;

                const data = await fetchViaProxy(mlUrl);
                const versionFilter = data.available_filters?.find(f => f.id === 'VEHICLE_VERSION' || f.id === 'TRIM');
                if (versionFilter) {
                    return versionFilter.values.map(v => ({ id: v.id, name: v.name }));
                }
            } catch (e) { }

            // 4. Mock Mode (DISABLED FOR VERIFICATION)
            return [];
            /*
            const staticVersions = commonVersions.map(v => ({ id: v, name: v }));
            staticVersions._source = 'api-mock';
            return staticVersions;
            */

        }
    },

    getBodyType: async (brandId, modelId) => {
        const staticBrand = popularModels[brandId];
        if (staticBrand) {
            const staticModel = staticBrand.find(m => m.id === modelId);
            if (staticModel && staticModel.bodyType) {
                return staticModel.bodyType;
            }
        }
        try {
            const response = await fetch(`${API_BASE_URL}/versions?brandId=${brandId}&modelId=${modelId}`);
            const data = await response.json();
            return data.bodyType || 'sedan';
        } catch (error) {
            return 'sedan';
        }
    }
};

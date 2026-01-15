export const popularBrands = [
    { id: 'VOLKSWAGEN', name: 'Volkswagen' },
    { id: 'FIAT', name: 'Fiat' },
    { id: 'FORD', name: 'Ford' },
    { id: 'TOYOTA', name: 'Toyota' },
    { id: 'RENAULT', name: 'Renault' },
    { id: 'CHEVROLET', name: 'Chevrolet' },
    { id: 'PEUGEOT', name: 'Peugeot' },
    { id: 'CITROEN', name: 'Citroën' },
    { id: 'NISSAN', name: 'Nissan' },
    { id: 'JEEP', name: 'Jeep' },
    { id: 'HONDA', name: 'Honda' },
    { id: 'RAM', name: 'RAM' },
    { id: 'AUDI', name: 'Audi' },
    { id: 'BMW', name: 'BMW' },
    { id: 'MERCEDES_BENZ', name: 'Mercedes-Benz' }
];

export const popularModels = {
    'VOLKSWAGEN': [
        { id: 'AMAROK', name: 'Amarok', bodyType: 'pickup' },
        { id: 'GOL_TREND', name: 'Gol Trend', bodyType: 'hatchback' },
        { id: 'VENTO', name: 'Vento', bodyType: 'sedan' },
        { id: 'POLO', name: 'Polo', bodyType: 'hatchback' },
        { id: 'VIRTUS', name: 'Virtus', bodyType: 'sedan' },
        { id: 'T_CROSS', name: 'T-Cross', bodyType: 'suv' },
        { id: 'NIVUS', name: 'Nivus', bodyType: 'suv' },
        { id: 'TAOS', name: 'Taos', bodyType: 'suv' },
        { id: 'SURAN', name: 'Suran', bodyType: 'minivan' },
        { id: 'FOX', name: 'Fox', bodyType: 'hatchback' }
    ],
    'FIAT': [
        { id: 'CRONOS', name: 'Cronos', bodyType: 'sedan' },
        { id: 'TORO', name: 'Toro', bodyType: 'pickup' },
        { id: 'STRADA', name: 'Strada', bodyType: 'pickup' },
        { id: 'ARGO', name: 'Argo', bodyType: 'hatchback' },
        { id: 'MOBI', name: 'Mobi', bodyType: 'hatchback' },
        { id: 'PULSE', name: 'Pulse', bodyType: 'suv' },
        { id: 'FIORINO', name: 'Fiorino', bodyType: 'utilitario' },
        { id: 'PALIO', name: 'Palio', bodyType: 'hatchback' },
        { id: 'SIENA', name: 'Siena', bodyType: 'sedan' }
    ],
    'FORD': [
        { id: 'RANGER', name: 'Ranger', bodyType: 'pickup' },
        { id: 'ECOSPORT', name: 'EcoSport', bodyType: 'suv' },
        { id: 'MAVERICK', name: 'Maverick', bodyType: 'pickup' },
        { id: 'TERRITORY', name: 'Territory', bodyType: 'suv' },
        { id: 'BRONCO', name: 'Bronco', bodyType: 'suv' },
        { id: 'KA', name: 'Ka', bodyType: 'hatchback' },
        { id: 'FIESTA', name: 'Fiesta', bodyType: 'hatchback' },
        { id: 'FOCUS', name: 'Focus', bodyType: 'hatchback' },
        { id: 'F_150', name: 'F-150', bodyType: 'pickup' }
    ],
    'TOYOTA': [
        { id: 'HILUX', name: 'Hilux', bodyType: 'pickup' },
        { id: 'COROLLA', name: 'Corolla', bodyType: 'sedan' },
        { id: 'ETIOS', name: 'Etios', bodyType: 'hatchback' },
        { id: 'YARIS', name: 'Yaris', bodyType: 'hatchback' },
        { id: 'COROLLA_CROSS', name: 'Corolla Cross', bodyType: 'suv' },
        { id: 'SW4', name: 'SW4', bodyType: 'suv' },
        { id: 'RAV4', name: 'RAV4', bodyType: 'suv' }
    ],
    'RENAULT': [
        { id: 'SANDERO', name: 'Sandero', bodyType: 'hatchback' },
        { id: 'LOGAN', name: 'Logan', bodyType: 'sedan' },
        { id: 'KANGOO', name: 'Kangoo', bodyType: 'utilitario' },
        { id: 'DUSTER', name: 'Duster', bodyType: 'suv' },
        { id: 'ALASKAN', name: 'Alaskan', bodyType: 'pickup' },
        { id: 'STEPWAY', name: 'Stepway', bodyType: 'hatchback' },
        { id: 'OROCH', name: 'Oroch', bodyType: 'pickup' },
        { id: 'KWID', name: 'Kwid', bodyType: 'hatchback' },
        { id: 'CAPTUR', name: 'Captur', bodyType: 'suv' }
    ],
    'CHEVROLET': [
        { id: 'CRUZE', name: 'Cruze', bodyType: 'sedan' },
        { id: 'ONIX', name: 'Onix', bodyType: 'hatchback' },
        { id: 'TRACKER', name: 'Tracker', bodyType: 'suv' },
        { id: 'S10', name: 'S10', bodyType: 'pickup' },
        { id: 'SPIN', name: 'Spin', bodyType: 'minivan' },
        { id: 'PRISMA', name: 'Prisma', bodyType: 'sedan' },
        { id: 'TRAILBLAZER', name: 'Trailblazer', bodyType: 'suv' },
        { id: 'EQUINOX', name: 'Equinox', bodyType: 'suv' }
    ],
    'PEUGEOT': [
        { id: '208', name: '208', bodyType: 'hatchback' },
        { id: '2008', name: '2008', bodyType: 'suv' },
        { id: 'PARTNER', name: 'Partner', bodyType: 'utilitario' },
        { id: '3008', name: '3008', bodyType: 'suv' },
        { id: '308', name: '308', bodyType: 'hatchback' },
        { id: '408', name: '408', bodyType: 'sedan' }
    ]
};

export const commonVersions = [
    'Base', 'Full', 'Pack', 'Comfortline', 'Trendline', 'Highline', 'Titanium', 'XLS', 'XLT', 'Limited', 'SR', 'SRV', 'SRX', 'Freedom', 'Volcano', 'Intens', 'Iconic'
];

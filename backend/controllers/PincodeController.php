<?php
/**
 * Pincode Controller
 * Provides postal PIN code lookup for auto-populating city, district, and state.
 */
require_once __DIR__ . '/../helpers/Response.php';

class PincodeController {
    public function lookup() {
        $pincode = trim($_GET['pincode'] ?? '');
        $pincode = preg_replace('/\D/', '', $pincode);

        if (strlen($pincode) !== 6) {
            Response::error('PIN code must be a 6-digit number.', 400);
        }

        // 1. Attempt public Postal PIN code API (fast & accurate)
        $url = "https://api.postalpincode.in/pincode/" . urlencode($pincode);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Microfinance-ERP/1.0');
        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw && $httpCode === 200) {
            $json = json_decode($raw, true);
            if (is_array($json) && !empty($json[0]['PostOffice']) && ($json[0]['Status'] ?? '') === 'Success') {
                $postOffices = $json[0]['PostOffice'];
                $first = $postOffices[0];
                $district = trim($first['District'] ?? '');
                $state = trim($first['State'] ?? '');
                $city = trim($first['Block'] ?? $first['Name'] ?? '');
                
                $offices = [];
                foreach ($postOffices as $po) {
                    $name = trim($po['Name'] ?? '');
                    if ($name && !in_array($name, $offices)) {
                        $offices[] = $name;
                    }
                }

                Response::json(true, 'PIN code verified', [
                    'pincode' => $pincode,
                    'district' => $district,
                    'state' => $state,
                    'city' => $city,
                    'offices' => array_slice($offices, 0, 15)
                ]);
            }
        }

        // 2. Fallback prefix state map if postal API is unreachable or returns no record
        $prefix = (int)substr($pincode, 0, 2);
        $fallbackMap = [
            11 => ['state' => 'Delhi', 'district' => 'Delhi'],
            12 => ['state' => 'Haryana', 'district' => 'Mahendragarh'],
            13 => ['state' => 'Haryana', 'district' => 'Ambala'],
            14 => ['state' => 'Punjab', 'district' => 'Ludhiana'],
            15 => ['state' => 'Punjab', 'district' => 'Bathinda'],
            16 => ['state' => 'Chandigarh', 'district' => 'Chandigarh'],
            17 => ['state' => 'Himachal Pradesh', 'district' => 'Shimla'],
            18 => ['state' => 'Jammu and Kashmir', 'district' => 'Jammu'],
            19 => ['state' => 'Jammu and Kashmir', 'district' => 'Srinagar'],
            20 => ['state' => 'Uttar Pradesh', 'district' => 'Aligarh'],
            21 => ['state' => 'Uttar Pradesh', 'district' => 'Kanpur'],
            22 => ['state' => 'Uttar Pradesh', 'district' => 'Lucknow'],
            23 => ['state' => 'Uttar Pradesh', 'district' => 'Varanasi'],
            24 => ['state' => 'Uttar Pradesh', 'district' => 'Bareilly'],
            25 => ['state' => 'Uttar Pradesh', 'district' => 'Meerut'],
            26 => ['state' => 'Uttarakhand', 'district' => 'Dehradun'],
            27 => ['state' => 'Uttar Pradesh', 'district' => 'Gorakhpur'],
            28 => ['state' => 'Uttar Pradesh', 'district' => 'Agra'],
            30 => ['state' => 'Rajasthan', 'district' => 'Jaipur'],
            31 => ['state' => 'Rajasthan', 'district' => 'Udaipur'],
            32 => ['state' => 'Rajasthan', 'district' => 'Kota'],
            33 => ['state' => 'Rajasthan', 'district' => 'Bikaner'],
            34 => ['state' => 'Rajasthan', 'district' => 'Jodhpur'],
            36 => ['state' => 'Gujarat', 'district' => 'Rajkot'],
            37 => ['state' => 'Gujarat', 'district' => 'Kutch'],
            38 => ['state' => 'Gujarat', 'district' => 'Ahmedabad'],
            39 => ['state' => 'Gujarat', 'district' => 'Surat'],
            40 => ['state' => 'Maharashtra', 'district' => 'Mumbai'],
            41 => ['state' => 'Maharashtra', 'district' => 'Pune'],
            42 => ['state' => 'Maharashtra', 'district' => 'Nashik'],
            43 => ['state' => 'Maharashtra', 'district' => 'Aurangabad'],
            44 => ['state' => 'Maharashtra', 'district' => 'Nagpur'],
            45 => ['state' => 'Madhya Pradesh', 'district' => 'Indore'],
            46 => ['state' => 'Madhya Pradesh', 'district' => 'Bhopal'],
            47 => ['state' => 'Madhya Pradesh', 'district' => 'Gwalior'],
            48 => ['state' => 'Madhya Pradesh', 'district' => 'Jabalpur'],
            49 => ['state' => 'Chhattisgarh', 'district' => 'Raipur'],
            50 => ['state' => 'Telangana', 'district' => 'Hyderabad'],
            51 => ['state' => 'Andhra Pradesh', 'district' => 'Tirupati'],
            52 => ['state' => 'Andhra Pradesh', 'district' => 'Vijayawada'],
            53 => ['state' => 'Andhra Pradesh', 'district' => 'Visakhapatnam'],
            56 => ['state' => 'Karnataka', 'district' => 'Bengaluru'],
            57 => ['state' => 'Karnataka', 'district' => 'Mysore'],
            58 => ['state' => 'Karnataka', 'district' => 'Hubli'],
            59 => ['state' => 'Karnataka', 'district' => 'Belgaum'],
            60 => ['state' => 'Tamil Nadu', 'district' => 'Chennai'],
            61 => ['state' => 'Tamil Nadu', 'district' => 'Tiruchirappalli'],
            62 => ['state' => 'Tamil Nadu', 'district' => 'Madurai'],
            63 => ['state' => 'Tamil Nadu', 'district' => 'Salem'],
            64 => ['state' => 'Tamil Nadu', 'district' => 'Coimbatore'],
            67 => ['state' => 'Kerala', 'district' => 'Kozhikode'],
            68 => ['state' => 'Kerala', 'district' => 'Ernakulam'],
            69 => ['state' => 'Kerala', 'district' => 'Thiruvananthapuram'],
            70 => ['state' => 'West Bengal', 'district' => 'Kolkata'],
            71 => ['state' => 'West Bengal', 'district' => 'Howrah'],
            72 => ['state' => 'West Bengal', 'district' => 'Midnapore'],
            73 => ['state' => 'West Bengal', 'district' => 'Siliguri'],
            74 => ['state' => 'West Bengal', 'district' => 'North 24 Parganas'],
            75 => ['state' => 'Odisha', 'district' => 'Bhubaneswar'],
            76 => ['state' => 'Odisha', 'district' => 'Berhampur'],
            77 => ['state' => 'Odisha', 'district' => 'Rourkela'],
            78 => ['state' => 'Assam', 'district' => 'Guwahati'],
            79 => ['state' => 'North East', 'district' => 'Shillong'],
            80 => ['state' => 'Bihar', 'district' => 'Patna'],
            81 => ['state' => 'Bihar', 'district' => 'Bhagalpur'],
            82 => ['state' => 'Jharkhand', 'district' => 'Ranchi'],
            83 => ['state' => 'Jharkhand', 'district' => 'Jamshedpur'],
            84 => ['state' => 'Bihar', 'district' => 'Muzaffarpur'],
            85 => ['state' => 'Bihar', 'district' => 'Purnia']
        ];

        if (isset($fallbackMap[$prefix])) {
            Response::json(true, 'PIN code mapped by region', [
                'pincode' => $pincode,
                'district' => $fallbackMap[$prefix]['district'],
                'state' => $fallbackMap[$prefix]['state'],
                'city' => '',
                'offices' => []
            ]);
        }

        Response::error('Location not found for this PIN code. Please enter manually.', 404);
    }
}

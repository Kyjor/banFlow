import Foundation
import HealthKit
import CoreLocation

// ---------------------------------------------------------------------------
// Codable structs that map to Rust / TypeScript types
// ---------------------------------------------------------------------------

struct HKWorkoutJSON: Codable {
    let id: String
    let activity_type: String
    let start_date: String
    let end_date: String
    let duration_seconds: Double
    let distance_meters: Double?
    let energy_burned_kcal: Double?
    let average_heart_rate: Double?
    let max_heart_rate: Double?
    let temperature_celsius: Double?
    let humidity_percent: Double?
    let weather_condition: String?
}

struct WorkoutDetailsJSON: Codable {
    var hr_zone_1_seconds: Double?
    var hr_zone_2_seconds: Double?
    var hr_zone_3_seconds: Double?
    var hr_zone_4_seconds: Double?
    var hr_zone_5_seconds: Double?
    var min_heart_rate: Double?
    var average_heart_rate: Double?
    var max_heart_rate: Double?
    var average_cadence: Double?
    var average_stride_length_meters: Double?
    var average_ground_contact_time_ms: Double?
    var average_vertical_oscillation_cm: Double?
    var average_power_watts: Double?
    var max_power_watts: Double?
    var elevation_gain_meters: Double?
    var elevation_loss_meters: Double?
    var vo2_max: Double?
    var route_points: String?  // JSON string
}

struct RoutePoint: Codable {
    let lat: Double
    let lng: Double
    let alt: Double?
    let t: Double?
}

// ---------------------------------------------------------------------------
// Singleton health store
// ---------------------------------------------------------------------------

private let healthStore = HKHealthStore()
nonisolated(unsafe) private let iso8601: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

// ---------------------------------------------------------------------------
// Request authorization
// ---------------------------------------------------------------------------

@_cdecl("request_healthkit_permission")
public func requestHealthKitPermission() -> Bool {
    guard HKHealthStore.isHealthDataAvailable() else { return false }

    var typesToRead: Set<HKObjectType> = [
        HKObjectType.workoutType(),
        HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
        HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        HKObjectType.quantityType(forIdentifier: .heartRate)!,
        HKObjectType.quantityType(forIdentifier: .vo2Max)!,
    ]

    // Running-form metrics (watchOS 9+ / iOS 16+)
    if #available(iOS 16.0, *) {
        if let strideType = HKObjectType.quantityType(forIdentifier: .runningStrideLength) {
            typesToRead.insert(strideType)
        }
        if let gctType = HKObjectType.quantityType(forIdentifier: .runningGroundContactTime) {
            typesToRead.insert(gctType)
        }
        if let voType = HKObjectType.quantityType(forIdentifier: .runningVerticalOscillation) {
            typesToRead.insert(voType)
        }
        if let powerType = HKObjectType.quantityType(forIdentifier: .runningPower) {
            typesToRead.insert(powerType)
        }
    }

    // Workout routes for GPS
    typesToRead.insert(HKSeriesType.workoutRoute())

    let lock = NSLock()
    var granted = false
    let semaphore = DispatchSemaphore(value: 0)
    healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
        lock.lock(); granted = success; lock.unlock()
        if let error = error {
            print("[HealthKit] Auth error: \(error.localizedDescription)")
        }
        semaphore.signal()
    }
    semaphore.wait()
    return granted
}

// ---------------------------------------------------------------------------
// Fetch workout list (basic info — fast)
// ---------------------------------------------------------------------------

@_cdecl("fetch_healthkit_workouts")
public func fetchHealthKitWorkouts(
    startDateStr: UnsafePointer<CChar>?,
    endDateStr: UnsafePointer<CChar>?,
    resultPtr: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?,
    resultLen: UnsafeMutablePointer<Int>?
) -> Int32 {
    guard HKHealthStore.isHealthDataAvailable() else {
        print("[HealthKit] Health data not available")
        return -1
    }

    let startDate = startDateStr.flatMap { iso8601.date(from: String(cString: $0)) }
    let endDate = endDateStr.flatMap { iso8601.date(from: String(cString: $0)) } ?? Date()

    print("[HealthKit] Fetching workouts from \(String(describing: startDate)) to \(endDate)")

    // Fetch all workouts from HealthKit (no type/date predicate), then
    // apply date-range filtering in-memory.
    let predicate: NSPredicate? = nil
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

    let lock = NSLock()
    var results: [HKWorkoutJSON] = []
    let semaphore = DispatchSemaphore(value: 0)
    var queryError: Error?

    let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [sort]
    ) { _, samples, error in
        if let error = error {
            print("[HealthKit] Query error: \(error.localizedDescription)")
            lock.lock(); queryError = error; lock.unlock()
            semaphore.signal()
            return
        }
        guard let workouts = samples as? [HKWorkout] else {
            print("[HealthKit] No workouts returned or invalid type")
            lock.lock(); queryError = NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid workout samples"]); lock.unlock()
            semaphore.signal()
            return
        }
        
        print("[HealthKit] Found \(workouts.count) total workouts")

        let workoutsInRange = workouts.filter { w in
            let afterStart = startDate.map { w.startDate >= $0 } ?? true
            let beforeEnd = w.startDate <= endDate
            return afterStart && beforeEnd
        }
        print("[HealthKit] Date-range filtered to \(workoutsInRange.count) workouts")

        // Include all workout activity types.
        print("[HealthKit] Including all \(workoutsInRange.count) workout activity types")

        if workoutsInRange.isEmpty {
            lock.lock(); results = []; lock.unlock()
            semaphore.signal()
            return
        }

        // Keep list-query lightweight and deterministic. Detailed metrics are
        // fetched later by fetch_workout_details at import time.
        var items: [HKWorkoutJSON] = []
        items.reserveCapacity(workoutsInRange.count)
        for workout in workoutsInRange {
            let weather = extractWeather(from: workout)
            items.append(HKWorkoutJSON(
                id: workout.uuid.uuidString,
                activity_type: activityTypeName(workout.workoutActivityType),
                start_date: iso8601.string(from: workout.startDate),
                end_date: iso8601.string(from: workout.endDate),
                duration_seconds: workout.duration,
                distance_meters: workout.totalDistance?.doubleValue(for: .meter()),
                energy_burned_kcal: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                average_heart_rate: nil,
                max_heart_rate: nil,
                temperature_celsius: weather.temperature,
                humidity_percent: weather.humidity,
                weather_condition: weather.condition
            ))
        }

        lock.lock()
        results = items.sorted { $0.start_date > $1.start_date }
        lock.unlock()
        print("[HealthKit] Successfully processed \(results.count) workouts")
        semaphore.signal()
        return
    }

    healthStore.execute(query)
    semaphore.wait()

    if let error = queryError {
        print("[HealthKit] Query error: \(error.localizedDescription)")
        return -3
    }

    do {
        let json = try JSONEncoder().encode(results)
        let str = String(data: json, encoding: .utf8)!
        resultPtr?.pointee = strdup(str)
        resultLen?.pointee = str.utf8.count
        return Int32(results.count)
    } catch {
        print("[HealthKit] Encode error: \(error)")
        return -4
    }
}

// ---------------------------------------------------------------------------
// Fetch full details for a single workout (called at import time)
// ---------------------------------------------------------------------------

@_cdecl("fetch_workout_details")
public func fetchWorkoutDetails(
    workoutIdStr: UnsafePointer<CChar>,
    maxHR: Double,
    resultPtr: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?,
    resultLen: UnsafeMutablePointer<Int>?
) -> Int32 {
    guard HKHealthStore.isHealthDataAvailable() else {
        print("[HealthKit] [details] Health data not available")
        return -1
    }
    let workoutId = String(cString: workoutIdStr)
    print("[HealthKit] [details] Starting fetchWorkoutDetails for id=\(workoutId)")

    // Fetch the specific workout object first
    let fetchStart = Date()
    guard let workout = fetchWorkoutById(workoutId) else {
        let elapsed = Date().timeIntervalSince(fetchStart)
        print("[HealthKit] [details] fetchWorkoutById returned nil for id=\(workoutId) after \(elapsed)s")
        return -2
    }
    let elapsedFetch = Date().timeIntervalSince(fetchStart)
    let distMeters = workout.totalDistance?.doubleValue(for: .meter()) ?? -1
    print("[HealthKit] [details] Found workout id=\(workoutId) duration=\(workout.duration)s distance_m=\(distMeters) fetchTime=\(elapsedFetch)s")

    let semaphore = DispatchSemaphore(value: 0)
    var details = WorkoutDetailsJSON()
    let group = DispatchGroup()

    // ── Heart Rate (full samples for zones + min) ─────────────────────────
    group.enter()
    let hrStart = Date()
    print("[HealthKit] [details] HR samples query starting for id=\(workoutId)")
    fetchHRSamples(workout: workout) { samples in
        print("[HealthKit] [details] HR samples callback for id=\(workoutId) count=\(samples.count) elapsed=\(Date().timeIntervalSince(hrStart))s")
        if !samples.isEmpty {
            let values = samples.map { $0.quantity.doubleValue(for: HKUnit(from: "count/min")) }
            details.min_heart_rate = values.min()
            // Compute average / max HR from samples
            let avg = values.reduce(0, +) / Double(values.count)
            details.average_heart_rate = avg
            details.max_heart_rate = values.max()
            let effectiveMax = maxHR > 0 ? maxHR : (values.max() ?? 190)
            details.hr_zone_1_seconds = 0; details.hr_zone_2_seconds = 0
            details.hr_zone_3_seconds = 0; details.hr_zone_4_seconds = 0
            details.hr_zone_5_seconds = 0
            // Approximate time per sample = total_duration / sample_count
            let secondsPerSample = workout.duration / Double(samples.count)
            for sample in samples {
                let bpm = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
                let pct = bpm / effectiveMax
                if      pct < 0.60 { details.hr_zone_1_seconds! += secondsPerSample }
                else if pct < 0.70 { details.hr_zone_2_seconds! += secondsPerSample }
                else if pct < 0.80 { details.hr_zone_3_seconds! += secondsPerSample }
                else if pct < 0.90 { details.hr_zone_4_seconds! += secondsPerSample }
                else               { details.hr_zone_5_seconds! += secondsPerSample }
            }
        }
        group.leave()
    }

    // ── Cadence (step count → steps/min) ─────────────────────────────────
    group.enter()
    let cadenceStart = Date()
    print("[HealthKit] [details] Cadence stats query starting for id=\(workoutId)")
    fetchStatistic(workout: workout, type: .stepCount, options: .cumulativeSum) { stats in
        if let total = stats?.sumQuantity()?.doubleValue(for: .count()) {
            details.average_cadence = total / (workout.duration / 60.0)
            print("[HealthKit] [details] Cadence stats complete for id=\(workoutId) totalSteps=\(total) elapsed=\(Date().timeIntervalSince(cadenceStart))s")
        } else {
            print("[HealthKit] [details] Cadence stats missing for id=\(workoutId) elapsed=\(Date().timeIntervalSince(cadenceStart))s")
        }
        group.leave()
    }

    // ── Running form (iOS 16+ / watchOS 9+) ─────────────────────────────
    if #available(iOS 16.0, *) {
        group.enter()
        let strideStart = Date()
        print("[HealthKit] [details] Stride length stats query starting for id=\(workoutId)")
        fetchStatistic(workout: workout, type: .runningStrideLength, options: .discreteAverage) { stats in
            details.average_stride_length_meters = stats?.averageQuantity()?.doubleValue(for: .meter())
            print("[HealthKit] [details] Stride length stats complete for id=\(workoutId) value=\(details.average_stride_length_meters ?? -1) elapsed=\(Date().timeIntervalSince(strideStart))s")
            group.leave()
        }

        group.enter()
        let gctStart = Date()
        print("[HealthKit] [details] Ground contact time stats query starting for id=\(workoutId)")
        fetchStatistic(workout: workout, type: .runningGroundContactTime, options: .discreteAverage) { stats in
            // HealthKit stores GCT in seconds; convert to ms
            if let secs = stats?.averageQuantity()?.doubleValue(for: .second()) {
                details.average_ground_contact_time_ms = secs * 1000
                print("[HealthKit] [details] GCT stats complete for id=\(workoutId) value_ms=\(details.average_ground_contact_time_ms ?? -1) elapsed=\(Date().timeIntervalSince(gctStart))s")
            } else {
                print("[HealthKit] [details] GCT stats missing for id=\(workoutId) elapsed=\(Date().timeIntervalSince(gctStart))s")
            }
            group.leave()
        }

        group.enter()
        let voStart = Date()
        print("[HealthKit] [details] Vertical oscillation stats query starting for id=\(workoutId)")
        fetchStatistic(workout: workout, type: .runningVerticalOscillation, options: .discreteAverage) { stats in
            // HealthKit stores in metres; convert to cm
            if let metres = stats?.averageQuantity()?.doubleValue(for: .meter()) {
                details.average_vertical_oscillation_cm = metres * 100
                print("[HealthKit] [details] VO stats complete for id=\(workoutId) value_cm=\(details.average_vertical_oscillation_cm ?? -1) elapsed=\(Date().timeIntervalSince(voStart))s")
            } else {
                print("[HealthKit] [details] VO stats missing for id=\(workoutId) elapsed=\(Date().timeIntervalSince(voStart))s")
            }
            group.leave()
        }

        group.enter()
        let powerStart = Date()
        print("[HealthKit] [details] Running power stats query starting for id=\(workoutId)")
        fetchStatistic(workout: workout, type: .runningPower, options: [.discreteAverage, .discreteMax]) { stats in
            details.average_power_watts = stats?.averageQuantity()?.doubleValue(for: HKUnit.watt())
            details.max_power_watts = stats?.maximumQuantity()?.doubleValue(for: HKUnit.watt())
            print("[HealthKit] [details] Power stats complete for id=\(workoutId) avg=\(details.average_power_watts ?? -1) max=\(details.max_power_watts ?? -1) elapsed=\(Date().timeIntervalSince(powerStart))s")
            group.leave()
        }
    }

    // ── VO2 max (latest sample) ──────────────────────────────────────────
    group.enter()
    let vo2Start = Date()
    print("[HealthKit] [details] VO2 max query starting for id=\(workoutId)")
    fetchLatestVO2Max { v in
        details.vo2_max = v
        print("[HealthKit] [details] VO2 max query complete for id=\(workoutId) value=\(v ?? -1) elapsed=\(Date().timeIntervalSince(vo2Start))s")
        group.leave()
    }

    // ── GPS Route ────────────────────────────────────────────────────────
    group.enter()
    let routeStart = Date()
    print("[HealthKit] [details] Route query starting for id=\(workoutId)")
    fetchRoute(workout: workout) { points, gain, loss in
        details.elevation_gain_meters = gain
        details.elevation_loss_meters = loss
        if let pts = points, !pts.isEmpty {
            if let json = try? JSONEncoder().encode(pts),
               let str = String(data: json, encoding: .utf8) {
                details.route_points = str
            }
            print("[HealthKit] [details] Route query complete for id=\(workoutId) points=\(pts.count) gain=\(gain ?? -1) loss=\(loss ?? -1) elapsed=\(Date().timeIntervalSince(routeStart))s")
        } else {
            print("[HealthKit] [details] Route query returned no points for id=\(workoutId) gain=\(gain ?? -1) loss=\(loss ?? -1) elapsed=\(Date().timeIntervalSince(routeStart))s")
        }
        group.leave()
    }

    let groupStart = Date()
    group.notify(queue: .global()) { semaphore.signal() }
    semaphore.wait()
    let groupElapsed = Date().timeIntervalSince(groupStart)
    print("[HealthKit] [details] All detail sub-queries completed for id=\(workoutId) in \(groupElapsed)s, encoding JSON…")

    do {
        let json = try JSONEncoder().encode(details)
        let str = String(data: json, encoding: .utf8)!
        resultPtr?.pointee = strdup(str)
        resultLen?.pointee = str.utf8.count
        print("[HealthKit] [details] Encoded details JSON for id=\(workoutId) length=\(str.utf8.count) bytes")
        return 0
    } catch {
        print("[HealthKit] Encode details error: \(error)")
        return -4
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

private func fetchWorkoutById(_ uuidStr: String) -> HKWorkout? {
    guard let uuid = UUID(uuidString: uuidStr) else { return nil }
    let predicate = HKQuery.predicateForObject(with: uuid)
    let lock = NSLock()
    var result: HKWorkout?
    let semaphore = DispatchSemaphore(value: 0)
    let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate, limit: 1, sortDescriptors: nil
    ) { _, samples, _ in
        lock.lock(); result = samples?.first as? HKWorkout; lock.unlock()
        semaphore.signal()
    }
    healthStore.execute(query)
    semaphore.wait()
    return result
}

private func fetchBasicHR(workout: HKWorkout, completion: @escaping @Sendable (Double?, Double?) -> Void) {
    guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
        completion(nil, nil); return
    }
    let pred = HKQuery.predicateForSamples(withStart: workout.startDate, end: workout.endDate, options: .strictStartDate)
    let query = HKStatisticsQuery(quantityType: hrType, quantitySamplePredicate: pred, options: [.discreteAverage, .discreteMax]) { _, stats, _ in
        let avg = stats?.averageQuantity()?.doubleValue(for: HKUnit(from: "count/min"))
        let max = stats?.maximumQuantity()?.doubleValue(for: HKUnit(from: "count/min"))
        completion(avg, max)
    }
    healthStore.execute(query)
}

private func fetchHRSamples(workout: HKWorkout, completion: @escaping @Sendable ([HKQuantitySample]) -> Void) {
    guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
        completion([]); return
    }
    let pred = HKQuery.predicateForSamples(withStart: workout.startDate, end: workout.endDate, options: .strictStartDate)
    let query = HKSampleQuery(sampleType: hrType, predicate: pred, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
        completion((samples as? [HKQuantitySample]) ?? [])
    }
    healthStore.execute(query)
}

private func fetchStatistic(
    workout: HKWorkout,
    type: HKQuantityTypeIdentifier,
    options: HKStatisticsOptions,
    completion: @escaping @Sendable (HKStatistics?) -> Void
) {
    guard let qType = HKQuantityType.quantityType(forIdentifier: type) else {
        completion(nil); return
    }
    let pred = HKQuery.predicateForSamples(withStart: workout.startDate, end: workout.endDate, options: .strictStartDate)
    let query = HKStatisticsQuery(quantityType: qType, quantitySamplePredicate: pred, options: options) { _, stats, _ in
        completion(stats)
    }
    healthStore.execute(query)
}

private func fetchLatestVO2Max(completion: @escaping @Sendable (Double?) -> Void) {
    guard let vo2Type = HKQuantityType.quantityType(forIdentifier: .vo2Max) else {
        completion(nil); return
    }
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
    let query = HKSampleQuery(sampleType: vo2Type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
        let val = (samples?.first as? HKQuantitySample)?
            .quantity.doubleValue(for: HKUnit(from: "ml/kg*min"))
        completion(val)
    }
    healthStore.execute(query)
}

private func fetchRoute(
    workout: HKWorkout,
    completion: @escaping @Sendable ([RoutePoint]?, Double?, Double?) -> Void
) {
    let pred = HKQuery.predicateForObjects(from: workout)
    let lock = NSLock()
    var allPoints: [RoutePoint] = []
    var gain: Double = 0
    var loss: Double = 0
    let semaphore = DispatchSemaphore(value: 0)
    let routeLock = NSLock()
    var routeCount = 0

    let routeQuery = HKSampleQuery(
        sampleType: HKSeriesType.workoutRoute(),
        predicate: pred, limit: HKObjectQueryNoLimit, sortDescriptors: nil
    ) { _, samples, _ in
        guard let routes = samples as? [HKWorkoutRoute], !routes.isEmpty else {
            semaphore.signal(); return
        }
        routeLock.lock(); routeCount = routes.count; routeLock.unlock()
        let routeSemaphore = DispatchSemaphore(value: 0)
        let completedLock = NSLock()
        var completed = 0

        for route in routes {
            let routePointsLock = NSLock()
            var routePoints: [CLLocation] = []
            let locationQuery = HKWorkoutRouteQuery(route: route) { _, locations, done, _ in
                if let locs = locations {
                    routePointsLock.lock(); routePoints.append(contentsOf: locs); routePointsLock.unlock()
                }
                if done {
                    // Compute elevation gain/loss from altitude changes
                    var prevAlt: Double? = nil
                    routePointsLock.lock()
                    let points = routePoints
                    routePointsLock.unlock()
                    for loc in points {
                        let alt = loc.altitude
                        if let prev = prevAlt {
                            let diff = alt - prev
                            lock.lock()
                            if diff > 0 { gain += diff } else { loss += abs(diff) }
                            lock.unlock()
                        }
                        prevAlt = alt
                        // Sample every 5th point to limit data size (GPS runs can have thousands)
                        lock.lock()
                        allPoints.append(RoutePoint(
                            lat: loc.coordinate.latitude,
                            lng: loc.coordinate.longitude,
                            alt: alt,
                            t: loc.timestamp.timeIntervalSince1970 * 1000
                        ))
                        lock.unlock()
                    }
                    completedLock.lock()
                    completed += 1
                    let count = completed
                    let total = routeCount
                    completedLock.unlock()
                    if count == total { routeSemaphore.signal() }
                }
            }
            healthStore.execute(locationQuery)
        }
        routeSemaphore.wait()
        semaphore.signal()
    }

    healthStore.execute(routeQuery)
    semaphore.wait()

    let sampled = stride(from: 0, to: allPoints.count, by: max(1, allPoints.count / 500)).map { allPoints[$0] }
    completion(sampled.isEmpty ? nil : sampled, gain > 0 ? gain : nil, loss > 0 ? loss : nil)
}

private struct WeatherData { var temperature: Double?; var humidity: Double?; var condition: String? }

private func extractWeather(from workout: HKWorkout) -> WeatherData {
    var data = WeatherData()
    guard let meta = workout.metadata else { return data }

    if let tempQ = meta[HKMetadataKeyWeatherTemperature] as? HKQuantity {
        data.temperature = tempQ.doubleValue(for: .degreeCelsius())
    }
    if let humQ = meta[HKMetadataKeyWeatherHumidity] as? HKQuantity {
        data.humidity = humQ.doubleValue(for: HKUnit.percent()) * 100
    }
    if let condNum = meta[HKMetadataKeyWeatherCondition] as? NSNumber {
        data.condition = weatherConditionString(condNum.intValue)
    }
    return data
}

private func weatherConditionString(_ raw: Int) -> String? {
    switch raw {
    case 1, 2:        return "clear"
    case 3, 4, 5:     return "cloudy"
    case 6, 7:        return "foggy"
    case 8, 9:        return "windy"
    case 12, 18, 20:  return "snow"
    case 21, 22, 23:  return "rain"
    case 15, 16, 17:  return "rain"
    case 24, 25, 26:  return "storm"
    default:          return nil
    }
}

private func activityTypeName(_ type: HKWorkoutActivityType) -> String {
    switch type {
    case .running:  return "running"
    case .walking:  return "walking"
    case .hiking:   return "hiking"
    default:        return "other"
    }
}

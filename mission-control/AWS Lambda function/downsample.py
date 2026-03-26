def downsample_points(points, target_count):
    num_points = len(points)
    if target_count >= num_points:
        return points  # No downsampling needed
    else:
        step = num_points // target_count
        downsampled_points = [points[i] for i in range(0, len(points) - 1, step)]
        downsampled_points.append(points[-1])
        return downsampled_points

import open3d as o3d


def convert_pcd_to_ascii(input_pcd_path, output_pcd_path):
    try:
        # Load the binary compressed PCD file
        pcd = o3d.io.read_point_cloud(input_pcd_path)

        # Save the file in ASCII format
        success = o3d.io.write_point_cloud(output_pcd_path, pcd, write_ascii=True)

        if success:
            print(f"Successfully converted the file to ASCII format: {output_pcd_path}")
        else:
            print("Failed to save the ASCII PCD file.")

    except Exception as e:
        print(f"Error during PCD conversion: {e}")


# Example usage
input_pcd_file = "dragon.pcd"  # Input binary compressed PCD file
output_pcd_file = "dragon-ascii.pcd"  # Output ASCII PCD file

convert_pcd_to_ascii(input_pcd_file, output_pcd_file)

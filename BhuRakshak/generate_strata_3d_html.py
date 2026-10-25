import numpy as np
import plotly.graph_objects as go
import os

def create_zone_3d_figure(zone_id="zone_a"):
    x = np.linspace(0, 100, 48)
    y = np.linspace(0, 80, 40)
    X, Y = np.meshgrid(x, y)
    
    fig = go.Figure()
    
    if zone_id == "zone_a":
        # ZONE A: Active Longwall Panel 7 (Critical Subsidence ~28.2 mm/yr)
        dist = np.sqrt((X - 52.0) ** 2 + (Y - 42.0) ** 2)
        R = 42.0
        max_disp = 2.45
        W_2D = max_disp * np.exp(-np.pi * (dist / R) ** 2.2)
        Z_surface = 0.0 - W_2D
        
        # 1. Surface Topography (Subsided Trough)
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_surface,
            colorscale=[
                [0.0, "#7e22ce"],   # Deep purple compression core
                [0.2, "#dc2626"],   # Red sag
                [0.45, "#ea580c"],  # Orange tension ring
                [0.7, "#ca8a04"],   # Yellow-lime transition
                [1.0, "#16a34a"]    # Undisturbed ground green
            ],
            name="Ground Surface",
            showscale=False,
            opacity=0.95,
            hoverinfo="x+y+z"
        ))
        
        # 2. Main Roof Sandstone (-12m)
        Z_sandstone = -12.0 - W_2D * 0.45
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_sandstone,
            colorscale=[[0, "#c2b299"], [1, "#a8967b"]],
            showscale=False, name="Sandstone Roof", opacity=0.75
        ))
        
        # 3. Immediate Roof Shale (-20m)
        Z_shale = -20.0 - W_2D * 0.75
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_shale,
            colorscale=[[0, "#475569"], [1, "#334155"]],
            showscale=False, name="Shale Roof", opacity=0.80
        ))
        
        # 4. Coal Seam (-28m) with Caved Goaf Void in Center
        Z_coal = -28.0 * np.ones_like(X)
        mask_goaf = (X >= 36.0) & (X <= 68.0) & (Y >= 26.0) & (Y <= 58.0)
        Z_coal_masked = np.copy(Z_coal)
        Z_coal_masked[mask_goaf] = np.nan
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_coal_masked,
            colorscale=[[0, "#0f172a"], [1, "#1e293b"]],
            showscale=False, name="Coal Seam Pillars", opacity=0.95
        ))
        
        # 5. Caved Goaf Floor
        XV, YV = np.meshgrid(np.linspace(36, 68, 10), np.linspace(26, 58, 10))
        fig.add_trace(go.Surface(
            x=XV, y=YV, z=-28.0 * np.ones_like(XV),
            colorscale=[[0, "#ffffff"], [1, "#f1f5f9"]],
            showscale=False, name="Caved Void (-28m)", opacity=1.0
        ))
        
        # 6. Deep Borehole Wire Extensometer
        probe_z = np.linspace(-0.5, -28.0, 16)
        fig.add_trace(go.Scatter3d(
            x=52.0 * np.ones_like(probe_z), y=42.0 * np.ones_like(probe_z), z=probe_z,
            mode="lines+markers",
            line=dict(color="#9333ea", width=7),
            marker=dict(size=4.5, color="#c084fc"),
            name="Deep Borehole Probe",
            hovertext=[f"Borehole Probe (-{abs(z):.1f}m)" for z in probe_z],
            showlegend=False
        ))
        
        # Crisp concise labeled nodes (No long strings causing text collision!)
        primary_nodes = [
            {"name": "GW-01", "x": 52.0, "y": 42.0, "color": "#0f172a", "hover": "<b>Gateway GW-01 (Basin Core)</b><br/>Subsidence: 28.2 mm/yr<br/>LoRaWAN Concentrator"},
            {"name": "A-01", "x": 42.0, "y": 48.0, "color": "#7e22ce", "hover": "<b>Node A-01 (Compression Core)</b><br/>Subsidence: 24.5 mm/yr<br/>Biaxial Tiltmeter"},
            {"name": "A-02", "x": 62.0, "y": 36.0, "color": "#7e22ce", "hover": "<b>Node A-02 (Compression Core)</b><br/>Subsidence: 23.9 mm/yr<br/>Extensometer"},
            {"name": "A-03", "x": 34.0, "y": 58.0, "color": "#ea580c", "hover": "<b>Node A-03 (Tension Ring)</b><br/>Subsidence: 18.2 mm/yr<br/>Shear Inclinometer"},
            {"name": "A-04", "x": 70.0, "y": 26.0, "color": "#ea580c", "hover": "<b>Node A-04 (Tension Ring)</b><br/>Subsidence: 17.5 mm/yr<br/>Strain Gauge Array"},
            {"name": "A-05", "x": 76.0, "y": 64.0, "color": "#16a34a", "hover": "<b>Node A-05 (Inter-Panel Barrier to Zone B)</b><br/>Subsidence: 5.2 mm/yr<br/>Shared Anchor"},
            {"name": "A-06", "x": 20.0, "y": 20.0, "color": "#16a34a", "hover": "<b>Node A-06 (Outer Perimeter)</b><br/>Subsidence: 1.2 mm/yr<br/>Baseline Reference"}
        ]
        
        # Subtle mesh dots (no colliding text!)
        mesh_dots = [
            {"x": 48.0, "y": 34.0, "color": "#9333ea", "hover": "Node A-07 [Critical]: 25.1 mm/yr"},
            {"x": 56.0, "y": 50.0, "color": "#9333ea", "hover": "Node A-08 [Critical]: 24.0 mm/yr"}
        ]

    elif zone_id == "zone_b":
        # ZONE B: Transition Advance Panel 6 (Adjacent Panel - Perimeters Overlap!)
        dist = np.sqrt((X - 58.0) ** 2 + (Y - 48.0) ** 2)
        R = 40.0
        max_disp = 1.35
        W_2D = max_disp * np.exp(-np.pi * (dist / R) ** 2.0)
        Z_surface = 0.0 - W_2D
        
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_surface,
            colorscale=[
                [0.0, "#ea580c"],   # Orange moderate trough
                [0.4, "#facc15"],   # Yellow sag
                [0.7, "#a3e635"],   # Yellow-green
                [1.0, "#16a34a"]    # Undisturbed green
            ],
            name="Ground Surface",
            showscale=False, opacity=0.95, hoverinfo="x+y+z"
        ))
        
        Z_sandstone = -12.0 - W_2D * 0.4
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_sandstone,
            colorscale=[[0, "#c2b299"], [1, "#a8967b"]],
            showscale=False, name="Sandstone Roof", opacity=0.75
        ))
        
        Z_shale = -20.0 - W_2D * 0.65
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_shale,
            colorscale=[[0, "#475569"], [1, "#334155"]],
            showscale=False, name="Shale Roof", opacity=0.80
        ))
        
        Z_coal = -28.0 * np.ones_like(X)
        mask_goaf = (X >= 46.0) & (X <= 72.0) & (Y >= 36.0) & (Y <= 62.0)
        Z_coal_masked = np.copy(Z_coal)
        Z_coal_masked[mask_goaf] = np.nan
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_coal_masked,
            colorscale=[[0, "#0f172a"], [1, "#1e293b"]],
            showscale=False, name="Coal Seam Pillars", opacity=0.95
        ))
        
        primary_nodes = [
            {"name": "B-01", "x": 58.0, "y": 48.0, "color": "#ea580c", "hover": "<b>Node B-01 (Advance Epicenter)</b><br/>Subsidence: 15.6 mm/yr<br/>Tiltmeter Array"},
            {"name": "B-02", "x": 46.0, "y": 60.0, "color": "#facc15", "hover": "<b>Node B-02 (Advance Flank)</b><br/>Subsidence: 10.4 mm/yr<br/>Surface Extensometer"},
            {"name": "B-03", "x": 70.0, "y": 36.0, "color": "#facc15", "hover": "<b>Node B-03 (Advance Flank)</b><br/>Subsidence: 9.8 mm/yr<br/>Surface Extensometer"},
            {"name": "B-04", "x": 30.0, "y": 30.0, "color": "#16a34a", "hover": "<b>Node B-04 (Inter-Panel Barrier with Zone A)</b><br/>Subsidence: 4.8 mm/yr<br/>Shared Anchor"}
        ]
        mesh_dots = [
            {"x": 52.0, "y": 40.0, "color": "#ea580c", "hover": "Node B-05 [Transition]: 12.1 mm/yr"}
        ]

    else:
        # ZONE C: Stabilized Sand Stowing Panel 4 (Low Deflection ~4.2 mm/yr)
        dist = np.sqrt((X - 44.0) ** 2 + (Y - 38.0) ** 2)
        R = 38.0
        max_disp = 0.35
        W_2D = max_disp * np.exp(-np.pi * (dist / R) ** 2)
        Z_surface = 0.0 - W_2D
        
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_surface,
            colorscale=[
                [0.0, "#ca8a04"],   # Slight amber center
                [0.4, "#a3e635"],   # Lime green
                [1.0, "#16a34a"]    # Undisturbed green
            ],
            name="Ground Surface",
            showscale=False, opacity=0.95, hoverinfo="x+y+z"
        ))
        
        fig.add_trace(go.Surface(
            x=X, y=Y, z=-12.0 - W_2D * 0.3,
            colorscale=[[0, "#c2b299"], [1, "#a8967b"]],
            showscale=False, name="Sandstone Roof", opacity=0.75
        ))
        fig.add_trace(go.Surface(
            x=X, y=Y, z=-20.0 - W_2D * 0.5,
            colorscale=[[0, "#475569"], [1, "#334155"]],
            showscale=False, name="Shale Roof", opacity=0.80
        ))
        
        Z_coal = -28.0 * np.ones_like(X)
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z_coal,
            colorscale=[[0, "#0f172a"], [1, "#1e293b"]],
            showscale=False, name="Coal Seam Pillars", opacity=0.95
        ))
        
        # Sand Stowing Backfill Pack
        X_stow, Y_stow = np.meshgrid(np.linspace(30, 58, 8), np.linspace(24, 52, 8))
        fig.add_trace(go.Surface(
            x=X_stow, y=Y_stow, z=-27.2 * np.ones_like(X_stow),
            colorscale=[[0, "#d97706"], [1, "#b45309"]],
            showscale=False, name="Stabilized Sand Stowing Pack", opacity=0.95
        ))
        
        primary_nodes = [
            {"name": "C-01", "x": 44.0, "y": 38.0, "color": "#ca8a04", "hover": "<b>Node C-01 (Stowed Goaf)</b><br/>Subsidence: 4.2 mm/yr<br/>Settlement Potentiometer"},
            {"name": "C-02", "x": 28.0, "y": 50.0, "color": "#16a34a", "hover": "<b>Node C-02 (Perimeter)</b><br/>Subsidence: 1.2 mm/yr<br/>Baseline Tiltmeter"},
            {"name": "C-03", "x": 62.0, "y": 26.0, "color": "#16a34a", "hover": "<b>Node C-03 (Perimeter)</b><br/>Subsidence: 1.0 mm/yr<br/>Baseline Tiltmeter"}
        ]
        mesh_dots = [
            {"x": 36.0, "y": 32.0, "color": "#ca8a04", "hover": "Node C-04 [Stowing]: 2.9 mm/yr"}
        ]

    # Add primary labeled nodes (clean elevation Z + 0.5m so text never intersects ground!)
    p_x = [n["x"] for n in primary_nodes]
    p_y = [n["y"] for n in primary_nodes]
    p_z = [
        - (max_disp * np.exp(-np.pi * (np.sqrt((n["x"]-50)**2 + (n["y"]-40)**2)/R)**2)) + 0.45
        for n in primary_nodes
    ]
    p_col = [n["color"] for n in primary_nodes]
    p_lbl = [n["name"] for n in primary_nodes]
    p_hov = [n["hover"] for n in primary_nodes]
    
    fig.add_trace(go.Scatter3d(
        x=p_x, y=p_y, z=p_z,
        mode="markers+text",
        marker=dict(size=8, color=p_col, line=dict(color="#ffffff", width=2)),
        text=p_lbl,
        textposition="top center",
        textfont=dict(size=10, color="#0f172a", family="Plus Jakarta Sans, sans-serif"),
        hovertext=p_hov, hoverinfo="text", showlegend=False
    ))
    
    # Add secondary mesh dots (no text clutter!)
    d_x = [n["x"] for n in mesh_dots]
    d_y = [n["y"] for n in mesh_dots]
    d_z = [
        - (max_disp * np.exp(-np.pi * (np.sqrt((n["x"]-50)**2 + (n["y"]-40)**2)/R)**2)) + 0.3
        for n in mesh_dots
    ]
    d_col = [n["color"] for n in mesh_dots]
    d_hov = [n["hover"] for n in mesh_dots]
    
    fig.add_trace(go.Scatter3d(
        x=d_x, y=d_y, z=d_z,
        mode="markers",
        marker=dict(size=5, color=d_col, line=dict(color="#ffffff", width=1.5)),
        hovertext=d_hov, hoverinfo="text", showlegend=False
    ))
    
    # Spacious clean 3D scene (camera slightly higher, clear perspective)
    fig.update_layout(
        scene=dict(
            xaxis=dict(
                title=dict(text="Strike X (m)", font=dict(size=10.5, color="#64748b")),
                showgrid=True, gridcolor="#f1f5f9", backgroundcolor="#ffffff",
                tickfont=dict(size=9, color="#94a3b8")
            ),
            yaxis=dict(
                title=dict(text="Dip Y (m)", font=dict(size=10.5, color="#64748b")),
                showgrid=True, gridcolor="#f1f5f9", backgroundcolor="#ffffff",
                tickfont=dict(size=9, color="#94a3b8")
            ),
            zaxis=dict(
                title=dict(text="Depth Z (m)", font=dict(size=10.5, color="#64748b")),
                showgrid=True, gridcolor="#f1f5f9", backgroundcolor="#ffffff",
                tickfont=dict(size=9, color="#94a3b8")
            ),
            camera=dict(
                eye=dict(x=-1.55, y=-1.75, z=1.25),
                center=dict(x=0, y=0, z=-0.10)
            ),
            aspectratio=dict(x=1.35, y=1.05, z=0.55),
            bgcolor="#ffffff"
        ),
        paper_bgcolor="#ffffff",
        margin=dict(l=0, r=0, t=5, b=5),
        showlegend=False
    )
    
    return fig

def export_zone_html(fig, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    html_content = fig.to_html(
        include_plotlyjs="cdn",
        config={
            "displayModeBar": False,
            "responsive": True,
            "scrollZoom": True
        }
    )
    custom_style = """
    <style>
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        background: #ffffff !important;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
      }
      .plotly-graph-div {
        width: 100vw !important;
        height: 100vh !important;
      }
    </style>
    """
    html_content = html_content.replace("<head>", f"<head>{custom_style}")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"[SUCCESS] Exported 3D model: {output_path}")

def generate_all_zones_3d():
    zones = ["zone_a", "zone_b", "zone_c"]
    for zid in zones:
        fig = create_zone_3d_figure(zid)
        export_zone_html(fig, f"public/interactive_strata_3d_{zid}.html")
    
    fig_a = create_zone_3d_figure("zone_a")
    export_zone_html(fig_a, "public/interactive_strata_subsidence_3d.html")

if __name__ == "__main__":
    generate_all_zones_3d()

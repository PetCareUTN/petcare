package com.petcare.app.features.adopciones.domain

/**
 * Provincias argentinas, para publicar una mascota en adopción y para filtrar
 * el listado por zona.
 *
 * Es la misma lista que el backend valida en
 * `src/common/constants/provincias.ts`: si cambia allá, hay que cambiarla acá.
 * Está duplicada a propósito, igual que los códigos de país: son 24 nombres
 * que no cambian, y traerlos por la red costaría un endpoint más y una espera
 * antes de poder dibujar el formulario.
 */
val PROVINCIAS_ARGENTINA = listOf(
    "Buenos Aires",
    "Catamarca",
    "Chaco",
    "Chubut",
    "Ciudad Autónoma de Buenos Aires",
    "Corrientes",
    "Córdoba",
    "Entre Ríos",
    "Formosa",
    "Jujuy",
    "La Pampa",
    "La Rioja",
    "Mendoza",
    "Misiones",
    "Neuquén",
    "Río Negro",
    "Salta",
    "San Juan",
    "San Luis",
    "Santa Cruz",
    "Santa Fe",
    "Santiago del Estero",
    "Tierra del Fuego",
    "Tucumán"
)

/** Texto de la opción que no filtra por provincia, en la pantalla de filtros. */
const val TODAS_LAS_PROVINCIAS = "Todas las provincias"

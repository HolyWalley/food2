# AI-Assisted Recipe Creation Feature Implementation Plan

## Overview
Add a button to the RecipeForm component that allows users to generate a recipe using AI. The AI will provide recipe name, description, ingredients, instructions, servings, prep time, and cook time. The system will then search for the required ingredients in the Nutritionix API, create any missing ingredients, and fill out the recipe form with the AI-generated data.

## Components

### 1. Cloudflare Function for AI Recipe Generation
- Create a new function at `/functions/api/recipe/generate.js`
- Implement OpenAI function calling for structured recipe generation
- Use OpenAI 4.1-mini model for cost-efficiency
- Accept optional parameters to guide recipe generation (cuisine, type, etc.)

### 2. Frontend Recipe Form Enhancements
- Add a "Generate Recipe" button near the recipe name field
- Create a modal/popup to collect recipe generation parameters
- Implement loading state while recipe is being generated
- Update form fields with the generated recipe data

### 3. Food Creation Integration
- Check if each ingredient exists in the local database
- Create new food items for missing ingredients using Nutritionix data
- Handle unit conversions appropriately

## Step-by-Step Implementation

### PART 1: Cloudflare Function for AI Recipe Generation

1. [x] Create the API endpoint structure
2. [x] Set up OpenAI API integration with function calling
3. [x] Define the recipe generation function schema
4. [x] Implement error handling and response formatting

### PART 2: Ingredient Processing

1. [x] Create helper function to search Nutritionix for each ingredient
2. [x] Implement parallel ingredient fetching using Promise.all
3. [x] Format ingredient data to match our application's Food model
4. [x] Add proper nutrition unit conversion

### PART 3: Frontend Integration

1. [x] Add "Generate Recipe" UI button to RecipeForm
2. [x] Create recipe generation parameters modal (optional)
3. [x] Implement API call to the recipe generation endpoint
4. [x] Process the response and populate form fields
5. [x] Create any missing food items in the local database
6. [x] Add proper error handling and loading states

## Testing Plan
- Test with various recipe types and cuisines
- Verify ingredient data accuracy
- Test error handling and edge cases
- Verify proper unit conversion
- Test with missing or incomplete Nutritionix data

## Technical Considerations
- Store OpenAI API key in .dev.vars (automatically loaded into functions)
- Ensure proper error handling across the entire flow
- Implement caching where appropriate to minimize API calls
- Maintain consistent unit conversions between Nutritionix and our app
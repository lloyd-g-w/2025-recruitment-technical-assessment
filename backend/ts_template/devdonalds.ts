import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

interface summary {
  name: string;
  cookTime: number;
  ingredients: requiredItem[];
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: (recipe | ingredient)[] = [];

// Task 1 helper (don't touch)
app.post("/parse", (req: Request, res: Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  }
  res.json({ msg: parsed_string });
  return;

});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that
const parse_handwriting = (recipeName: string): string | null => {
  let res = recipeName.replace(/[-_]/g, ' ')
    .replace(/[^A-Za-z ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (res.length <= 0) {
    return null;
  }

  res = res.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return res;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req: Request, res: Response) => {
  // Note - it is assumed that all reqs contain a type and name key
  let parsedReq = req.body;
  if (cookbook.map(entry => entry.name).includes(parsedReq.name)) {
    res.status(400).send("Duplicate entry");
    return;
  }

  switch (parsedReq.type) {
    case 'ingredient': {
      if (parsedReq.cookTime < 0) {
        res.status(400).send("Invalid cook time");
        return;
      }

      cookbook.push(parsedReq as ingredient);
      res.status(200).json({});
      return;
    }

    case 'recipe': {
      const requiredItems = (parsedReq as recipe).requiredItems;
      const requiredNames = requiredItems.map(item => item.name);
      if (requiredItems.length === 0 || requiredNames.length !== new Set(requiredNames).size) {
        res.status(400).send("Duplicate required items");
        return;
      }

      cookbook.push(parsedReq as recipe);
      res.status(200).json({});
      return;
    }

    default: {
      res.status(400).send("Invalid type");
      return;
    }
  }
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Request) => {
  const queryName = req.query.name as string;
  const entry = cookbook.find(entry => entry.name === queryName);
  if (entry === undefined || entry.type !== 'recipe') {
    res.status(400).send("Entry not found or not a recipe");
    return;
  }

  const getSummary = (recipe: recipe): summary | null => {
    let summary: summary = {
      name: recipe.name,
      cookTime: 0,
      ingredients: []
    };

    const addIngredientToSummary = (ingredient: ingredient | requiredItem, quantity: number) => {
      const existingIngredient = summary.ingredients.find(ing => ing.name === ingredient.name);
      if (existingIngredient === undefined) {
        summary.ingredients.push({ name: ingredient.name, quantity: quantity });
      } else {
        existingIngredient.quantity += quantity;
      }
    };

    for (const requiredItem of recipe.requiredItems) {
      const item = cookbook.find(entry => entry.name === requiredItem.name);
      if (item === undefined) {
        return null;
      }

      if (item.type === 'ingredient') {
        summary.cookTime += (item as ingredient).cookTime * requiredItem.quantity;
        addIngredientToSummary(item as ingredient, requiredItem.quantity);
      } else if (item.type === 'recipe') {
        const subRecipe = getSummary(item as recipe);
        if (subRecipe === null)
          return null;

        summary.cookTime += subRecipe.cookTime * requiredItem.quantity;
        for (const ingredient of subRecipe.ingredients) {
          addIngredientToSummary(ingredient, ingredient.quantity * requiredItem.quantity);
        }
      } else
        return null;
    }

    return summary;
  }

  const ret = getSummary(entry as recipe);
  if (ret === null) {
    res.status(400).send("Invalid recipe");
    return;
  }
  res.status(200).json(getSummary(entry as recipe));
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});

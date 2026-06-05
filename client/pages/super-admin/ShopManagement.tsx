import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { superAdminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  UploadCloud, 
  Link as LinkIcon, 
  File as FileIcon, 
  Image as ImageIcon, 
  Film,
  FileArchive,
  FileText,
  Package,
  X,
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon, 
  TrendingUp, 
  DollarSign, 
  FileCheck, 
  MoreVertical,
  ArrowUpDown
} from "lucide-react";

type ProductFile = {
  id?: number;
  url: string;
  type: "image" | "video" | "pdf" | "zip" | "other";
  source: "upload" | "link";
};

type ShopProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  thumbnail_url: string | null;
  stripe_billing_link: string | null;
  files: ProductFile[];
  created_at: string;
  updated_at: string;
};

export default function ShopManagement() {
  const { toast } = useToast();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"file" | "link">("file");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | string>("");
  const [stripeBillingLink, setStripeBillingLink] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // New UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "price-high" | "price-low" | "name">("newest");

  const filteredProducts = useMemo(() => {
    let res = [...products];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "price-high":
        res.sort((a, b) => b.price - a.price);
        break;
      case "price-low":
        res.sort((a, b) => a.price - b.price);
        break;
      case "name":
        res.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
      default:
        res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return res;
  }, [products, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const total = products.length;
    const value = products.reduce((acc, p) => acc + p.price, 0);
    const avg = total > 0 ? value / total : 0;
    const files = products.reduce((acc, p) => acc + (p.files?.length || 0), 0);
    return { total, avg, files };
  }, [products]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await superAdminApi.getShopProducts();
        const list = res.data?.products ?? [];
        setProducts(list);
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.response?.data?.error || "Failed to load products",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const clearCreateForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setStripeBillingLink("");
    setSelectedFiles([]);
    setLinkInput("");
    setThumbnailUrl(null);
    setCreateTab("file");
  };

  const onDropFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const allowed = arr.filter((f) => {
      const t = f.type.toLowerCase();
      return (
        t.startsWith("image/") ||
        t.startsWith("video/") ||
        t === "application/pdf" ||
        f.name.toLowerCase().endsWith(".zip")
      );
    });
    const next = [...selectedFiles, ...allowed].slice(0, 5);
    setSelectedFiles(next);
  };

  const getFileType = (file: File): ProductFile["type"] => {
    const t = file.type.toLowerCase();
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("video/")) return "video";
    if (t === "application/pdf") return "pdf";
    if (file.name.toLowerCase().endsWith(".zip")) return "zip";
    return "other";
  };

  const getIconForType = (type: ProductFile["type"]) => {
    switch (type) {
      case "image":
        return ImageIcon;
      case "video":
        return Film;
      case "pdf":
        return FileText;
      case "zip":
        return FileArchive;
      default:
        return FileIcon;
    }
  };

  const fetchMetaThumbnail = async (url: string): Promise<string | null> => {
    try {
      const res = await superAdminApi.fetchShopUrlMeta(url);
      const img = res.data?.image || null;
      setThumbnailUrl(img);
      return img;
    } catch {
      setThumbnailUrl(null);
      return null;
    }
  };

  useEffect(() => {
    if (createTab !== "link") return;
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setThumbnailUrl(null);
      return;
    }
    const id = setTimeout(() => {
      fetchMetaThumbnail(trimmed);
    }, 400);
    return () => clearTimeout(id);
  }, [createTab, linkInput]);

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadSingleImage = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append("files", file);
    const up = await superAdminApi.uploadShopFiles(form);
    const urls: string[] = up.data?.urls || [];
    return urls[0] || null;
  };

  const handleCreateThumbFileSelect = async (file: File | null) => {
    if (!file) return;
    const url = await uploadSingleImage(file);
    if (url) setThumbnailUrl(url);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeName = name.trim();
    const safePrice = typeof price === "string" ? parseFloat(price) : price;
    if (!safeName) {
      toast({ title: "Product Name Requid", variant: "destructive" });
      return;
    }
    if (createTab === "file" && selectedFiles.length === 0) {
      toast({ title: "Product Should Have Any Attachments Or Link", variant: "destructive" });
      return;
    }
    if (createTab === "link" && !linkInput.trim()) {
      toast({ title: "Product Should Have Any Attachments Or Link", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(safePrice)) {
      toast({ title: "Valid Price Required", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      let filesPayload: ProductFile[] = [];
      let thumbToUse: string | null | undefined = thumbnailUrl;
      if (createTab === "file" && selectedFiles.length > 0) {
        const form = new FormData();
        selectedFiles.forEach((f) => form.append("files", f));
        const up = await superAdminApi.uploadShopFiles(form);
        const urls: string[] = up.data?.urls || [];
        filesPayload = urls.map((u, idx) => ({
          url: u,
          type: getFileType(selectedFiles[idx]),
          source: "upload",
        }));
        if (!thumbToUse) {
          const first = filesPayload[0];
          thumbToUse = first?.url || null;
        }
      } else if (createTab === "link" && linkInput.trim()) {
        filesPayload = [
          {
            url: linkInput.trim(),
            type: "other",
            source: "link",
          },
        ];
        if (!thumbToUse) {
          const meta = await fetchMetaThumbnail(linkInput.trim());
          thumbToUse = meta || null;
        }
      }
      const res = await superAdminApi.createShopProduct({
        name: safeName,
        description: description.trim() || undefined,
        price: safePrice,
        thumbnail_url: thumbToUse ?? null,
        stripe_billing_link: stripeBillingLink.trim() || undefined,
        files: filesPayload,
      });
      const created = res.data?.product;
      if (created) {
        setProducts((prev) => [created, ...prev]);
        clearCreateForm();
        setIsCreateOpen(false);
        toast({ title: "Product Created", description: "New product added." });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.error || "Failed to create product.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await superAdminApi.deleteShopProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Product Deleted" });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.error || "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (product: ShopProduct) => {
    setEditingProduct(product);
    setIsEditing(true);
  };

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState<number | string>("");
  const [editStripeBillingLink, setEditStripeBillingLink] = useState("");
  const [editThumb, setEditThumb] = useState<string | null>(null);
  const [editFiles, setEditFiles] = useState<ProductFile[]>([]);
  const [replaceThumbFile, setReplaceThumbFile] = useState<File | null>(null);
  const [editAttachMode, setEditAttachMode] = useState<"file" | "link">("file");
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editLinkInput, setEditLinkInput] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ShopProduct | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setEditName(editingProduct.name);
      setEditDescription(editingProduct.description);
      setEditPrice(editingProduct.price);
      setEditStripeBillingLink(editingProduct.stripe_billing_link || "");
      setEditThumb(editingProduct.thumbnail_url);
      setEditFiles(editingProduct.files || []);
      setReplaceThumbFile(null);
      const hasUpload = (editingProduct.files || []).some((f) => f.source === "upload");
      const firstLink = (editingProduct.files || []).find((f) => f.source === "link");
      if (firstLink && !hasUpload) {
        setEditAttachMode("link");
        setEditLinkInput(firstLink.url);
      } else {
        setEditAttachMode("file");
        setEditLinkInput("");
      }
      setEditSelectedFiles([]);
    }
  }, [editingProduct]);

  const onDropEditFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const allowed = arr.filter((f) => {
      const t = f.type.toLowerCase();
      return (
        t.startsWith("image/") ||
        t.startsWith("video/") ||
        t === "application/pdf" ||
        f.name.toLowerCase().endsWith(".zip")
      );
    });
    const next = [...editSelectedFiles, ...allowed].slice(0, 5);
    setEditSelectedFiles(next);
  };

  const removeEditSelectedFile = (idx: number) => {
    setEditSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    if (editAttachMode !== "link") return;
    const trimmed = editLinkInput.trim();
    if (!trimmed) return;
    const id = setTimeout(async () => {
      const meta = await fetchMetaThumbnail(trimmed);
      if (meta && !replaceThumbFile) {
        setEditThumb(meta);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [editAttachMode, editLinkInput, replaceThumbFile]);

  const submitEdit = async () => {
    if (!editingProduct) return;
    try {
      const safeName = editName.trim();
      const safePrice = typeof editPrice === "string" ? parseFloat(editPrice) : editPrice;
      if (!safeName) {
        toast({ title: "Product Name Requid", variant: "destructive" });
        return;
      }
      if (!Number.isFinite(safePrice)) {
        toast({ title: "Valid Price Required", variant: "destructive" });
        return;
      }
      if (editAttachMode === "file" && editSelectedFiles.length === 0 && (!editFiles || editFiles.length === 0)) {
        toast({ title: "Product Should Have Any Attachments Or Link", variant: "destructive" });
        return;
      }
      if (editAttachMode === "link" && !editLinkInput.trim()) {
        toast({ title: "Product Should Have Any Attachments Or Link", variant: "destructive" });
        return;
      }

      let thumb = editThumb;
      if (replaceThumbFile) {
        const form = new FormData();
        form.append("files", replaceThumbFile);
        const up = await superAdminApi.uploadShopFiles(form);
        const urls: string[] = up.data?.urls || [];
        thumb = urls[0] || thumb;
      }
      let filesPayload: ProductFile[] | undefined = undefined;
      if (editAttachMode === "file") {
        const existing: ProductFile[] = (editFiles || []).map((f) => ({
          url: f.url,
          type: f.type,
          source: f.source,
        }));
        let uploaded: ProductFile[] = [];
        if (editSelectedFiles.length > 0) {
          const form = new FormData();
          editSelectedFiles.forEach((f) => form.append("files", f));
          const up = await superAdminApi.uploadShopFiles(form);
          const urls: string[] = up.data?.urls || [];
          uploaded = urls.map((u, idx) => ({
            url: u,
            type: getFileType(editSelectedFiles[idx]),
            source: "upload",
          }));
        }
        filesPayload = [...existing, ...uploaded];
        if (!thumb) {
          const first = filesPayload[0];
          thumb = first?.url || thumb;
        }
      } else if (editAttachMode === "link" && editLinkInput.trim()) {
        filesPayload = [
          {
            url: editLinkInput.trim(),
            type: "other",
            source: "link",
          },
        ];
        if (!thumb) {
          const meta = await fetchMetaThumbnail(editLinkInput.trim());
          thumb = meta || thumb;
        }
      }
      const payload = {
        name: safeName,
        description: editDescription.trim() || undefined,
        price: safePrice,
        thumbnail_url: thumb,
        stripe_billing_link: editStripeBillingLink.trim() || null,
        ...(filesPayload ? { files: filesPayload } : {}),
      };
      const res = await superAdminApi.updateShopProduct(editingProduct.id, payload);
      const updated = res.data?.product || null;
      if (updated) {
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...payload } as ShopProduct : p)));
      }
      setIsEditing(false);
      setEditingProduct(null);
      toast({ title: "Product Updated" });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.error || "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  return (
    <SuperAdminLayout
      title="Shop Management"
      description="Manage your digital products, files, and assets with advanced controls."
    >
      <div className="space-y-8 pb-20">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')] opacity-20"></div>
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                Super Admin Console
              </Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Digital Storefront
              </h1>
              <p className="text-lg text-white/80 leading-relaxed">
                Manage your product catalog, track performance, and organize digital assets in one unified, high-performance dashboard.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button 
                  size="lg" 
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-white text-indigo-600 hover:bg-white/90 font-bold shadow-xl shadow-black/10 border-0"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Product
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="bg-transparent border-white/30 text-white hover:bg-white/10"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Reports
                </Button>
              </div>
            </div>
            
            {/* Hero Stats */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto min-w-[300px]">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-sm text-white/60 font-medium">Total Revenue</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">${stats.total * stats.avg}</span>
                  <span className="text-xs text-emerald-300 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                  </span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-sm text-white/60 font-medium">Active Products</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60 font-medium">Total Assets</p>
                    <p className="text-2xl font-bold mt-1">{stats.files}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters & Toolbar */}
        <div className="sticky top-4 z-30 bg-background/80 backdrop-blur-xl border rounded-2xl p-2 shadow-lg flex flex-col md:flex-row gap-2 items-center justify-between transition-all">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input 
              placeholder="Search products..." 
              className="pl-10 bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[160px] rounded-xl border-transparent bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="name">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-8 w-px bg-border mx-1 hidden md:block" />

            <div className="flex bg-muted/50 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-black shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-black shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-6 text-center"
          >
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-inner">
              <Package className="w-16 h-16 text-muted-foreground/40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">No products found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                We couldn't find any products matching your search. Try adjusting your filters or create a new product.
              </p>
            </div>
            <Button variant="outline" size="lg" onClick={() => { setSearchQuery(""); setSortBy("newest"); }} className="rounded-xl">
              Clear All Filters
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div 
              layout
              className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6" 
                : "space-y-3"
              }
            >
              {filteredProducts.map((p, i) => {
                const isImage = p.thumbnail_url && (/\.(png|jpg|jpeg|gif|webp)$/i.test(p.thumbnail_url) || p.thumbnail_url.startsWith("http"));
                const firstType = p.files?.[0]?.type || "other";
                const PrevIcon = getIconForType(firstType as ProductFile["type"]);

                if (viewMode === "list") {
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex items-center gap-4 bg-card hover:bg-accent/5 p-3 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="h-16 w-16 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0 border border-border/50 relative">
                         {isImage ? (
                          <img src={p.thumbnail_url!} alt={p.name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-muted-foreground/50">
                            <PrevIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-2">
                          <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono bg-primary/5 text-primary border-primary/10">
                            ${p.price.toFixed(2)}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <FileIcon className="w-3 h-3" /> {p.files?.length || 0}
                          </div>
                        </div>
                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary">
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                             onClick={() => {
                               setProductToDelete(p);
                               setConfirmDeleteOpen(true);
                             }}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group relative bg-card rounded-[2rem] border border-border/50 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden flex flex-col"
                  >
                    {/* Image Area */}
                    <div className="aspect-[4/3] w-full bg-muted/20 relative overflow-hidden">
                      {isImage ? (
                        <img 
                          src={p.thumbnail_url!} 
                          alt={p.name} 
                          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/30 bg-gradient-to-tr from-muted/50 via-muted/20 to-transparent">
                          <PrevIcon className="w-16 h-16 mb-2 drop-shadow-lg" />
                        </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                        <Badge className="bg-white/90 text-black backdrop-blur-md border-0 shadow-lg font-bold">
                          Digital
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/20 text-white hover:bg-black/40 border-0 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => startEdit(p)} className="cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setProductToDelete(p);
                              setConfirmDeleteOpen(true);
                            }} className="text-destructive cursor-pointer focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Bottom Content Over Image */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="font-bold text-xl text-white mb-1 leading-tight shadow-black/50 drop-shadow-md">{p.name}</h3>
                        <div className="flex items-center gap-2">
                           <span className="text-2xl font-bold text-white tracking-tight">${p.price.toFixed(2)}</span>
                           {p.price > 100 && (
                             <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 bg-emerald-500/10">Premium</Badge>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col gap-4 bg-gradient-to-b from-card to-muted/10">
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                        {p.description || "No description provided."}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300">
                          {p.files?.slice(0, 4).map((f, i) => {
                             const Icon = getIconForType(f.type);
                             return (
                               <div key={i} className="w-8 h-8 rounded-full bg-background shadow-md border border-border flex items-center justify-center text-xs transition-transform hover:scale-110 hover:z-10 relative z-0" title={f.type}>
                                 <Icon className="w-4 h-4 text-muted-foreground" />
                               </div>
                             );
                          })}
                          {p.files?.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold border border-background ring-2 ring-background z-10 shadow-sm">
                              +{p.files.length - 4}
                            </div>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-xs font-semibold hover:bg-primary/5 hover:text-primary group-hover:translate-x-1 transition-all"
                          onClick={() => startEdit(p)}
                        >
                          Manage <ArrowUpDown className="w-3 h-3 ml-1 rotate-90" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Product
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write description..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stripe Billing Link</label>
              <Input value={stripeBillingLink} onChange={(e) => setStripeBillingLink(e.target.value)} placeholder="https://buy.stripe.com/..." />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Attachments</label>
                <Badge variant="outline" className="text-xs">Up to 5 files</Badge>
              </div>
              <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as "file" | "link")}>
                <TabsList className="grid grid-cols-2 w-full md:w-[240px]">
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" /> File
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Link/URL
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {createTab === "file" ? (
            <div
              className="border-2 border-dashed rounded-xl p-6 bg-muted/30 hover:bg-muted/40 transition cursor-pointer"
              onClick={() => document.getElementById("shop-file-input")?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer?.files?.length) {
                  onDropFiles(e.dataTransfer.files);
                }
              }}
            >
              {selectedFiles.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm">Click to select files or drag and drop</p>
                  <p className="text-xs text-muted-foreground">Images, Videos, PDFs, ZIP</p>
                </div>
              ) : (
                <div className="group relative">
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 text-white text-sm">
                    Click to add more files
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedFiles.map((f, idx) => {
                      const type = getFileType(f);
                      const Icon = getIconForType(type);
                      return (
                        <div key={idx} className="relative border rounded-lg p-3 flex items-center gap-2 text-sm">
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full w-5 h-5 bg-muted hover:bg-muted/60"
                            onClick={() => removeSelectedFile(idx)}
                            aria-label="Remove file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Input
                id="shop-file-input"
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.avi,.mkv,.pdf,.zip"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) onDropFiles(e.target.files);
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://example.com/resource" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Product Thumbnail</label>
            <Badge variant="outline" className="text-xs">Image only</Badge>
          </div>
          <div
            className="relative rounded-lg border bg-muted/30 overflow-hidden h-36 flex items-center justify-center group"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer?.files?.[0] || null;
              if (file && file.type.toLowerCase().startsWith("image/")) {
                handleCreateThumbFileSelect(file);
              }
            }}
            onClick={() => document.getElementById("shop-thumb-input-create")?.click()}
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="thumbnail" className="object-cover w-full h-full" />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="w-5 h-5" />
                <span>No thumbnail</span>
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition"
              onClick={() => document.getElementById("shop-thumb-input-create")?.click()}
            >
              {thumbnailUrl ? "Replace" : "Add Thumbnail"}
            </Button>
            <Input
              id="shop-thumb-input-create"
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
              onChange={(e) => handleCreateThumbFileSelect(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
            Cancel
          </Button>
              <Button type="submit" disabled={isCreating} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Create Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Product
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
            </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Stripe Billing Link</label>
            <Input value={editStripeBillingLink} onChange={(e) => setEditStripeBillingLink(e.target.value)} placeholder="https://buy.stripe.com/..." />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Attachments</label>
              <Badge variant="outline" className="text-xs">Up to 5 files</Badge>
            </div>
            <Tabs value={editAttachMode} onValueChange={(v) => setEditAttachMode(v as "file" | "link")}>
              <TabsList className="grid grid-cols-2 w-full md:w-[240px]">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> File
                </TabsTrigger>
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Link/URL
                </TabsTrigger>
            </TabsList>
          </Tabs>
          {editAttachMode === "file" ? (
            <>
            <div
              className="border-2 border-dashed rounded-xl p-6 bg-muted/30 hover:bg-muted/40 transition cursor-pointer"
              onClick={() => document.getElementById("shop-edit-file-input")?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer?.files?.length) {
                    onDropEditFiles(e.dataTransfer.files);
                  }
              }}
            >
              {editSelectedFiles.length === 0 && editFiles.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm">Click to select files or drag and drop</p>
                  <p className="text-xs text-muted-foreground">Images, Videos, PDFs, ZIP</p>
                </div>
              ) : (
                <div className="group relative">
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 text-white text-sm">
                    Click to add more files
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {editFiles.map((f, idx) => {
                      const Icon = getIconForType(f.type);
                      const name = f.url.split("/").pop()?.split("?")[0] || f.type;
                      return (
                        <div key={`existing-${idx}`} className="relative border rounded-lg p-3 flex items-center gap-2 text-sm">
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{name}</span>
                          <button
                            type="button"
                            className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full w-5 h-5 bg-muted hover:bg-muted/60"
                            onClick={() => removeEditExistingFile(idx)}
                            aria-label="Remove file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {editSelectedFiles.map((f, idx) => {
                      const type = getFileType(f);
                      const Icon = getIconForType(type);
                      return (
                          <div key={`new-${idx}`} className="relative border rounded-lg p-3 flex items-center gap-2 text-sm">
                            <Icon className="w-4 h-4" />
                            <span className="truncate">{f.name}</span>
                            <button
                              type="button"
                              className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full w-5 h-5 bg-muted hover:bg-muted/60"
                              onClick={() => removeEditSelectedFile(idx)}
                              aria-label="Remove file"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Input
                id="shop-edit-file-input"
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.avi,.mkv,.pdf,.zip"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) onDropEditFiles(e.target.files);
                }}
             />
            </div>
            </>
          ) : (
            <div className="space-y-2">
              <Input value={editLinkInput} onChange={(e) => setEditLinkInput(e.target.value)} placeholder="https://example.com/resource" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Product Thumbnail</label>
          <div
            className="relative rounded-lg border bg-muted/30 overflow-hidden h-36 flex items-center justify-center group"
            onClick={() => document.getElementById("shop-thumb-replace")?.click()}
          >
            {editThumb ? (
              <img src={editThumb} alt="thumbnail" className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-5 h-5" />
                  <span>No thumbnail</span>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition"
                onClick={() => document.getElementById("shop-thumb-replace")?.click()}
              >
                Replace
              </Button>
              <Input
                id="shop-thumb-replace"
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setReplaceThumbFile(file);
                  if (file) setEditThumb(URL.createObjectURL(file));
                }}
              />
              <div
                className="absolute inset-0"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer?.files?.[0] || null;
                  if (file && file.type.toLowerCase().startsWith("image/")) {
                    setReplaceThumbFile(file);
                    setEditThumb(URL.createObjectURL(file));
                  }
                }}
              />
          </div>
        </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="button" onClick={submitEdit} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are You Sure To Delete ${productToDelete?.name || "this"} Product`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (productToDelete) {
                  await deleteProduct(productToDelete.id);
                }
                setConfirmDeleteOpen(false);
                setProductToDelete(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
}
